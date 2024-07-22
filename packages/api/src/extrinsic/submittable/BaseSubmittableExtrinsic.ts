import { BlockHash, Extrinsic, Hash } from '@dedot/codecs';
import {
  AddressOrPair,
  Callback,
  IRuntimeTxCall,
  ISubmittableExtrinsic,
  ISubmittableResult,
  PayloadOptions,
  RpcVersion,
  SignerOptions,
  TxPaymentInfo,
  Unsub,
} from '@dedot/types';
import { DedotError, HexString, isFunction, toHex, u8aToHex } from '@dedot/utils';
import type { FrameSystemEventRecord, SubstrateApi } from '../../chaintypes/index.js';
import type { ISubstrateClient, ISubstrateClientAt } from '../../types.js';
import { ExtraSignedExtension } from '../extensions/index.js';
import { fakeSigner } from './fakeSigner.js';
import { isKeyringPair, signRaw } from './utils.js';

export abstract class BaseSubmittableExtrinsic extends Extrinsic implements ISubmittableExtrinsic {
  #alterTx?: HexString;

  constructor(
    public api: ISubstrateClient,
    call: IRuntimeTxCall,
  ) {
    super(api.registry, call);
  }

  async paymentInfo(account: AddressOrPair, options?: Partial<PayloadOptions>): Promise<TxPaymentInfo> {
    await this.sign(account, { ...options, signer: fakeSigner });

    const txU8a = this.toU8a();

    const api = this.api as ISubstrateClient<SubstrateApi[RpcVersion]>;
    return api.call.transactionPaymentApi.queryInfo(txU8a, txU8a.length);
  }

  async sign(fromAccount: AddressOrPair, options?: Partial<SignerOptions>) {
    const address = isKeyringPair(fromAccount) ? fromAccount.address : fromAccount.toString();
    const extra = new ExtraSignedExtension(this.api, {
      signerAddress: address,
      payloadOptions: options,
    });

    await extra.init();

    const { signer } = options || {};

    let signature;
    if (isKeyringPair(fromAccount)) {
      signature = u8aToHex(signRaw(fromAccount, extra.toRawPayload(this.callHex).data as HexString));
    } else if (signer?.signPayload) {
      const { signedTransaction, signature: txSignature } = await signer.signPayload(extra.toPayload(this.callHex));

      // If the tx payload are altered from signer
      // We'll need to handle that
      if (signedTransaction) {
        const alteredTx = this.$Codec.tryDecode(signedTransaction);

        // The alter tx should be signed
        if (!alteredTx.signed) {
          throw new DedotError('Altered transaction from signed is not signed');
        }

        // Signer's not allow the change the call data
        if (alteredTx.callHex !== this.callHex) {
          throw new DedotError('Call data does not match, signer is not allowed to change tx call data.');
        }

        this.#alterTx = toHex(signedTransaction);

        return this;
      }

      signature = txSignature;
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

    return this;
  }

  signAndSend(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<Hash>;
  signAndSend(account: AddressOrPair, callback: Callback<ISubmittableResult>): Promise<Unsub>;
  signAndSend(
    account: AddressOrPair,
    options: Partial<SignerOptions>,
    callback?: Callback<ISubmittableResult>,
  ): Promise<Unsub>;
  async signAndSend(
    fromAccount: AddressOrPair,
    partialOptions?: Partial<SignerOptions> | Callback<ISubmittableResult>,
    maybeCallback?: Callback<ISubmittableResult>,
  ): Promise<Hash | Unsub> {
    const [options, callback] = this.#normalizeOptions(partialOptions, maybeCallback);
    await this.sign(fromAccount, options);
    return this.send(callback as any);
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

  send(): Promise<Hash>;
  send(callback: Callback): Promise<Unsub>;
  send(callback?: Callback | undefined): Promise<Hash | Unsub> {
    throw new Error('Unimplemented!');
  }

  protected async getSystemEventsAt(hash: BlockHash): Promise<FrameSystemEventRecord[]> {
    const atApi = (await this.api.at(hash)) as ISubstrateClientAt<SubstrateApi[RpcVersion]>;
    return await atApi.query.system.events();
  }

  toHex(): HexString {
    return this.#alterTx || super.toHex();
  }
}
