import { BlockHash, SignedBlock, TransactionStatus } from '@dedot/codecs';
import {
  AddressOrPair,
  Callback,
  DryRunResult,
  ISubmittableExtrinsicLegacy,
  ISubmittableResult,
  SignerOptions,
  TxHash,
  TxStatus,
  TxUnsub,
  Unsub,
} from '@dedot/types';
import { assert, isHex, noop } from '@dedot/utils';
import { BaseSubmittableExtrinsic } from './BaseSubmittableExtrinsic.js';
import { SubmittableResult } from './SubmittableResult.js';
import { toTxStatus, txDefer } from './utils.js';

/**
 * @name SubmittableExtrinsic
 * @description A wrapper around an Extrinsic that exposes methods to sign, send, and other utility around Extrinsic.
 */
export class SubmittableExtrinsic extends BaseSubmittableExtrinsic implements ISubmittableExtrinsicLegacy {
  async dryRun(account: AddressOrPair, optionsOrHash?: Partial<SignerOptions> | BlockHash): Promise<DryRunResult> {
    const dryRunFn = this.client.rpc.system_dryRun;

    if (isHex(optionsOrHash)) {
      return dryRunFn(this.toHex(), optionsOrHash);
    }

    await this.sign(account, optionsOrHash);
    return dryRunFn(this.toHex());
  }

  send(): TxHash;
  send(callback: Callback<ISubmittableResult>): TxUnsub;
  send(callback?: Callback<ISubmittableResult> | undefined) {
    const isSubscription = !!callback;
    const txHex = this.toHex();
    const txHash = this.hash;

    const { deferTx, onTxProgress } = txDefer();

    let unsub: Unsub | undefined;

    this.client.rpc
      .author_submitAndWatchExtrinsic(txHex, async (txStatus: TransactionStatus) => {
        let status: TxStatus;
        let result: ISubmittableResult;

        if (txStatus.type === 'InBlock' || txStatus.type === 'Finalized') {
          const blockHash: BlockHash = txStatus.value;

          const [signedBlock, blockEvents] = await Promise.all([
            this.client.rpc.chain_getBlock(blockHash),
            this.getSystemEventsAt(blockHash),
          ]);

          const txIndex = (signedBlock as SignedBlock).block.extrinsics.indexOf(txHex);
          assert(txIndex >= 0, 'Extrinsic not found!');

          const events = blockEvents.filter(({ phase }) => phase.type === 'ApplyExtrinsic' && phase.value === txIndex);
          const blockNumber = (signedBlock as SignedBlock).block.header.number;

          status = toTxStatus(txStatus, { txIndex, blockNumber });
          result = this.transformTxResult(new SubmittableResult({ status, txHash, events, txIndex }));
        } else {
          status = toTxStatus(txStatus);
          result = this.transformTxResult(new SubmittableResult({ status, txHash }));
        }

        onTxProgress(result);

        if (isSubscription) {
          callback?.(result);
        } else {
          deferTx.resolve(txHash);
        }

        if (
          status.type === 'Finalized' || // --
          status.type === 'Invalid' ||
          status.type === 'Drop'
        ) {
          unsub?.().catch(noop);
        }
      })
      .then((x: Unsub) => {
        unsub = x;

        if (isSubscription) {
          deferTx.resolve(x);
        }
      })
      .catch(deferTx.reject);

    return deferTx.promise;
  }
}
