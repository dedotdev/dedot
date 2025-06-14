import { BlockHash, SignedBlock, TransactionStatus } from '@dedot/codecs';
import {
  AddressOrPair,
  Callback,
  DryRunResult,
  ISubmittableExtrinsicLegacy,
  ISubmittableResult,
  SignerOptions,
  TxHash,
  TxUnsub,
} from '@dedot/types';
import { assert, isHex } from '@dedot/utils';
import { BaseSubmittableExtrinsic } from './BaseSubmittableExtrinsic.js';
import { SubmittableResult } from './SubmittableResult.js';
import { RejectedTxError } from './errors.js';
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

    const unsub = this.client.rpc.author_submitAndWatchExtrinsic(txHex, async (txStatus: TransactionStatus) => {
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

        const status = toTxStatus(txStatus, { txIndex, blockNumber });
        const result = new SubmittableResult({ status, txHash, events, txIndex });

        onTxProgress(result);

        !isSubscription && deferTx.resolve(txHash);
        return callback?.(this.transformTxResult(result));
      } else {
        const status = toTxStatus(txStatus);
        const result = new SubmittableResult({ status, txHash });

        onTxProgress(result);

        !isSubscription && deferTx.resolve(txHash);
        return callback?.(this.transformTxResult(new SubmittableResult({ status, txHash })));
      }
    });

    if (isSubscription) {
      unsub.then((x) => {
        deferTx.resolve(x);
      });
    }

    return deferTx.promise;
  }
}
