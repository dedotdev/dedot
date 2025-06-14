import { BlockHash, Extrinsic } from '@dedot/codecs';
import {
  AddressOrPair,
  Callback,
  InjectedSigner,
  IRuntimeTxCall,
  ISubmittableExtrinsic,
  ISubmittableResult,
  PayloadOptions,
  RpcVersion,
  SignerOptions,
  TxHash,
  TxPaymentInfo,
  TxUnsub,
} from '@dedot/types';
import { DedotError, HexString, isFunction, toHex, u8aToHex } from '@dedot/utils';
import type { FrameSystemEventRecord, SubstrateApi } from '../../chaintypes/index.js';
import type { ISubstrateClient, ISubstrateClientAt } from '../../types.js';
import { ExtraSignedExtension } from '../extensions/index.js';
import { fakeSigner } from './fakeSigner.js';
import { isKeyringPair, signRawMessage, txDefer } from './utils.js';

interface TxHooks {
  beforeSign?: (tx: Extrinsic & ISubmittableExtrinsic, signerAddress: string) => Promise<void>;
  transformResult?: <R extends ISubmittableResult = ISubmittableResult>(result: ISubmittableResult) => R;
}

export abstract class BaseSubmittableExtrinsic extends Extrinsic implements ISubmittableExtrinsic {
  #alterTx?: HexString;
  #hooks?: TxHooks;

  constructor(
    readonly client: ISubstrateClient,
    call: IRuntimeTxCall,
  ) {
    super(client.registry, call);
  }

  withHooks(hooks: TxHooks) {
    this.#hooks = hooks;
  }

  protected transformTxResult<R extends ISubmittableResult = ISubmittableResult>(result: ISubmittableResult): R {
    const transform = this.#hooks?.transformResult;
    if (typeof transform === 'function') {
      return transform(result);
    }

    return result as any;
  }

  async paymentInfo(account: AddressOrPair, options?: Partial<PayloadOptions>): Promise<TxPaymentInfo> {
    await this.sign(account, { ...options, signer: fakeSigner });

    const txU8a = this.toU8a();

    const api = this.client as ISubstrateClient<SubstrateApi[RpcVersion]>;
    return api.call.transactionPaymentApi.queryInfo(txU8a, txU8a.length);
  }

  async sign(fromAccount: AddressOrPair, options?: Partial<SignerOptions>) {
    const address = isKeyringPair(fromAccount) ? fromAccount.address : fromAccount.toString();

    const beforeSign = this.#hooks?.beforeSign;
    if (beforeSign) await beforeSign(this, address);

    const extra = new ExtraSignedExtension(this.client, {
      signerAddress: address,
      payloadOptions: options,
    });

    await extra.init();

    const signer = this.#getSigner(options);

    let signature: HexString, alteredTx: HexString | Uint8Array | undefined;
    if (isKeyringPair(fromAccount)) {
      signature = u8aToHex(signRawMessage(fromAccount, extra.toRawPayload(this.callHex).data as HexString));
    } else if (signer?.signPayload) {
      const result = await signer.signPayload(extra.toPayload(this.callHex));

      signature = result.signature;
      alteredTx = result.signedTransaction;
    } else {
      throw new Error('Signer not found. Cannot sign the extrinsic!');
    }

    const { signatureTypeId } = this.registry.metadata!.extrinsic;
    const $Signature = this.registry.findCodec(signatureTypeId);

    this.attachSignature({
      address: address,
      signature: $Signature.tryDecode(signature),
      extra: extra.data,
    });

    // If the tx payload are altered from signer
    // We'll need to validate the altered tx
    // and broadcast it instead of the original tx
    if (alteredTx) {
      this.#validateSignedTx(alteredTx);
      this.#alterTx = toHex(alteredTx);
    }

    return this;
  }

  signAndSend(account: AddressOrPair, options?: Partial<SignerOptions>): TxHash;
  signAndSend(account: AddressOrPair, callback: Callback<ISubmittableResult>): TxUnsub;
  signAndSend(
    account: AddressOrPair,
    options: Partial<SignerOptions>,
    callback?: Callback<ISubmittableResult>,
  ): TxUnsub;
  signAndSend(
    fromAccount: AddressOrPair,
    partialOptions?: Partial<SignerOptions> | Callback<ISubmittableResult>,
    maybeCallback?: Callback<ISubmittableResult>,
  ) {
    const [options, callback] = this.#normalizeOptions(partialOptions, maybeCallback);

    const { deferTx, deferFinalized, deferBestChainBlockIncluded, onTxProgress } = txDefer();

    this.sign(fromAccount, options)
      .then(() => {
        const deferSend = this.send(callback as any);
        deferSend
          .then(deferTx.resolve) // --
          .catch(deferTx.reject);

        deferSend
          .untilBestChainBlockIncluded() //--
          .then((r) => {
            onTxProgress(r);
          })
          .catch((e) => {
            deferBestChainBlockIncluded()?.reject(e);
          });

        deferSend
          .untilFinalized() //--
          .then((r) => {
            onTxProgress(r);
          })
          .catch((e) => {
            deferBestChainBlockIncluded()?.reject(e);
            deferFinalized()?.reject(e);
          });
      })
      .catch(deferTx.reject);

    return deferTx.promise;
  }

  #normalizeOptions(
    partialOptions?: Partial<SignerOptions> | Callback<ISubmittableResult>,
    callback?: Callback<ISubmittableResult>,
  ): [Partial<SignerOptions>, Callback<ISubmittableResult> | undefined] {
    if (isFunction(partialOptions)) {
      return [{}, partialOptions];
    } else {
      return [Object.assign({}, partialOptions), callback];
    }
  }

  send(): TxHash;
  send(callback: Callback): TxUnsub;
  send(callback?: Callback | undefined): TxHash | TxUnsub {
    throw new Error('Unimplemented!');
  }

  protected async getSystemEventsAt(hash: BlockHash): Promise<FrameSystemEventRecord[]> {
    const atApi = (await this.client.at(hash)) as ISubstrateClientAt<SubstrateApi[RpcVersion]>;
    return await atApi.query.system.events();
  }

  toHex(): HexString {
    return this.#alterTx || super.toHex();
  }

  /**
   * Validate a raw signed transaction coming from signer
   * We need to make sure the tx is signed and call-data is intact/not-changing
   *
   * @param tx
   * @private
   */
  #validateSignedTx(tx: HexString | Uint8Array) {
    const alteredTx = this.$Codec.tryDecode(tx);

    // The alter tx should be signed
    if (!alteredTx.signed) {
      throw new DedotError('Altered transaction from signer is not signed');
    }
  }

  #getSigner(options?: Partial<SignerOptions>): InjectedSigner | undefined {
    return options?.signer || this.client.options.signer;
  }
}
