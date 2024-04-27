import { BlockHash, Extrinsic, Hash, SignedBlock, TransactionStatus } from '@dedot/codecs';
import {
  AddressOrPair,
  AsyncMethod,
  Callback,
  DryRunResult,
  IRuntimeTxCall,
  ISubmittableExtrinsicLegacy,
  ISubmittableResult,
  SignerOptions,
  Unsub,
} from '@dedot/types';
import { assert, HexString, isFunction, isHex, u8aToHex } from '@dedot/utils';
import type { FrameSystemEventRecord } from '../../chaintypes/index.js';
import { StorageQueryExecutor } from '../../executor/index.js';
import type { ISubstrateClient } from '../../types.js';
import { ExtraSignedExtension } from '../extensions/index.js';
import { SubmittableResult } from './SubmittableResult.js';
import { isKeyringPair, signRaw } from './utils.js';

/**
 * @name SubmittableExtrinsic
 * @description A wrapper around an Extrinsic that exposes methods to sign, send, and other utility around Extrinsic.
 */
export class SubmittableExtrinsic extends Extrinsic implements ISubmittableExtrinsicLegacy {
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

  async dryRun(account: AddressOrPair, optionsOrHash?: Partial<SignerOptions> | BlockHash): Promise<DryRunResult> {
    const dryRunFn = this.api.rpc.system_dryRun;

    if (isHex(optionsOrHash)) {
      return dryRunFn(this.toHex(), optionsOrHash);
    }

    await this.sign(account, optionsOrHash);
    return dryRunFn(this.toHex());
  }

  send(): Promise<Hash>;
  send(callback: Callback<ISubmittableResult>): Promise<Unsub>;
  async send(callback?: Callback<ISubmittableResult> | undefined): Promise<Hash | Unsub> {
    const isSubscription = !!callback;
    const txHash = this.hash;

    if (isSubscription) {
      return this.api.rpc.author_submitAndWatchExtrinsic(this.toHex(), async (status: TransactionStatus) => {
        if (status.tag === 'InBlock' || status.tag === 'Finalized') {
          const blockHash: BlockHash = status.value;

          const [signedBlock, blockEvents] = await Promise.all([
            this.api.rpc.chain_getBlock(blockHash),
            this.#getSystemEventsAt(blockHash),
          ]);

          const txIndex = (signedBlock as SignedBlock).block.extrinsics.findIndex(
            (tx) => this.registry.hashAsHex(tx as HexString) === txHash,
          );

          assert(txIndex >= 0, 'Extrinsic not found!');

          const events = blockEvents.filter(({ phase }) => phase.tag === 'ApplyExtrinsic' && phase.value === txIndex);

          return callback(new SubmittableResult({ status, txHash, events, txIndex }));
        } else {
          return callback(new SubmittableResult({ status, txHash }));
        }
      });
    } else {
      return this.api.rpc.author_submitExtrinsic(this.toHex());
    }
  }

  async #getSystemEventsAt(hash: BlockHash): Promise<FrameSystemEventRecord[]> {
    const executor = new StorageQueryExecutor(this.api, hash);
    const systemEventsFn = executor.execute('System', 'Events') as AsyncMethod<FrameSystemEventRecord[]>;
    return systemEventsFn();
  }
}
