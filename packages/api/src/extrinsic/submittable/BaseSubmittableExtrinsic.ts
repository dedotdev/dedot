import { BlockHash, Extrinsic, Hash } from '@dedot/codecs';
import {
  type AddressOrPair,
  AsyncMethod,
  type Callback,
  IRuntimeTxCall,
  ISubmittableExtrinsic,
  ISubmittableResult,
  type SignerOptions,
  type Unsub,
} from '@dedot/types';
import { HexString, isFunction, u8aToHex } from '@dedot/utils';
import { StorageQueryExecutor } from 'dedot';
import type { FrameSystemEventRecord } from 'dedot/chaintypes';
import { ISubstrateClient } from '../../types.js';
import { ExtraSignedExtension } from '../extensions/index.js';
import { isKeyringPair, signRaw } from './utils.js';

export abstract class BaseSubmittableExtrinsic extends Extrinsic implements ISubmittableExtrinsic {
  constructor(
    public api: ISubstrateClient,
    call: IRuntimeTxCall,
  ) {
    super(api.registry, call);
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
      signature = u8aToHex(
        signRaw(fromAccount, extra.toRawPayload(this.callHex).data as HexString, { withType: true }),
      );
    } else if (signer?.signPayload) {
      const result = await signer.signPayload(extra.toPayload(this.callHex));
      signature = result.signature;
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

  protected async _getSystemEventsAt(hash: BlockHash): Promise<FrameSystemEventRecord[]> {
    const executor = new StorageQueryExecutor(this.api, hash);
    const systemEventsFn = executor.execute('System', 'Events') as AsyncMethod<FrameSystemEventRecord[]>;
    return systemEventsFn();
  }
}
