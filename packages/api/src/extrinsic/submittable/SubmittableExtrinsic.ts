import { BlockHash, Hash, SignedBlock, TransactionStatus } from '@dedot/codecs';
import {
  AddressOrPair,
  Callback,
  DryRunResult,
  ISubmittableExtrinsicLegacy,
  ISubmittableResult,
  SignerOptions,
  Unsub,
} from '@dedot/types';
import { assert, isHex } from '@dedot/utils';
import { BaseSubmittableExtrinsic } from './BaseSubmittableExtrinsic.js';
import { SubmittableResult } from './SubmittableResult.js';
import { toTransactionStatusV2 } from './utils.js';

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
      return this.api.rpc.author_submitAndWatchExtrinsic(txHex, async (txStatus: TransactionStatus) => {
        if (txStatus.type === 'InBlock' || txStatus.type === 'Finalized') {
          const blockHash: BlockHash = txStatus.value;

          const [signedBlock, blockEvents] = await Promise.all([
            this.api.rpc.chain_getBlock(blockHash),
            this.getSystemEventsAt(blockHash),
          ]);

          const txIndex = (signedBlock as SignedBlock).block.extrinsics.indexOf(txHex);
          assert(txIndex >= 0, 'Extrinsic not found!');

          const events = blockEvents.filter(({ phase }) => phase.type === 'ApplyExtrinsic' && phase.value === txIndex);

          const status = toTransactionStatusV2(txStatus, txIndex);
          return callback(new SubmittableResult({ status, txHash, events, txIndex }));
        } else {
          const status = toTransactionStatusV2(txStatus);
          return callback(new SubmittableResult({ status, txHash }));
        }
      });
    } else {
      return this.api.rpc.author_submitExtrinsic(txHex);
    }
  }
}
