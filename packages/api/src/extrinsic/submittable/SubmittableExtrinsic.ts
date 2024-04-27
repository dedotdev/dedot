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
import { BaseSubmittableExtrinsic } from 'dedot/extrinsic/submittable/BaseSubmittableExtrinsic';
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
export class SubmittableExtrinsic extends BaseSubmittableExtrinsic implements ISubmittableExtrinsicLegacy {
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
    const txHex = this.toHex();
    const txHash = this.hash;

    if (isSubscription) {
      return this.api.rpc.author_submitAndWatchExtrinsic(txHex, async (status: TransactionStatus) => {
        if (status.tag === 'InBlock' || status.tag === 'Finalized') {
          const blockHash: BlockHash = status.value;

          const [signedBlock, blockEvents] = await Promise.all([
            this.api.rpc.chain_getBlock(blockHash),
            this._getSystemEventsAt(blockHash),
          ]);

          const txIndex = (signedBlock as SignedBlock).block.extrinsics.indexOf(txHex);
          assert(txIndex >= 0, 'Extrinsic not found!');

          const events = blockEvents.filter(({ phase }) => phase.tag === 'ApplyExtrinsic' && phase.value === txIndex);

          return callback(new SubmittableResult({ status, txHash, events, txIndex }));
        } else {
          return callback(new SubmittableResult({ status, txHash }));
        }
      });
    } else {
      return this.api.rpc.author_submitExtrinsic(txHex);
    }
  }
}
