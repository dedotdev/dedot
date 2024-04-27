import type { BlockHash, Hash } from '@dedot/codecs';
import type { Callback, IEventRecord, IRuntimeTxCall, ISubmittableResult, TransactionStatusV2, Unsub } from '@dedot/types';
import { deferred, noop } from '@dedot/utils';
import { DedotClient } from '../../client/index.js';
import { PinnedBlock } from '../../json-rpc/index.js';
import { BaseSubmittableExtrinsic } from './BaseSubmittableExtrinsic.js';
import { SubmittableResult } from './SubmittableResult.js';
import { InvalidExtrinsicError } from './errors.js';

/**
 * @name SubmittableExtrinsicV2
 * @description Submittable extrinsic based on JSON-RPC v2
 */
export class SubmittableExtrinsicV2 extends BaseSubmittableExtrinsic {
  constructor(
    public api: DedotClient,
    call: IRuntimeTxCall,
  ) {
    super(api, call);
  }

  async #send(callback: Callback<ISubmittableResult<IEventRecord, TransactionStatusV2>>): Promise<Unsub> {
    const api = this.api;
    const txHex = this.toHex();
    const txHash = this.hash;

    // validate the transaction
    // https://github.com/paritytech/json-rpc-interface-spec/issues/55#issuecomment-1609011150
    // TODO should we use api.at(api.chainHead.bestHash)
    const validateResult = await api.call.taggedTransactionQueue.validateTransaction(
      'External',
      txHex,
      api.chainHead.bestHash,
    );

    if (validateResult.isOk) {
      callback(new SubmittableResult({ status: { tag: 'Validated' }, txHash }));
    } else if (validateResult.isErr) {
      // TODO improve this error message
      throw new InvalidExtrinsicError(
        `Invalid transaction: ${validateResult.err.tag} - ${validateResult.err.value.tag}`,
        validateResult,
      );
    }

    const checkIsInBlock = async (
      newHash: BlockHash,
    ): Promise<{ index: number; events: IEventRecord[] } | undefined> => {
      const txs = await api.chainHead.body(newHash);
      const txIndex = txs.indexOf(txHex);
      if (txIndex < 0) return;

      const events = await this._getSystemEventsAt(newHash);
      const txEvents = events.filter(({ phase }) => phase.tag == 'ApplyExtrinsic' && phase.value === txIndex);

      return {
        index: txIndex,
        events: txEvents,
      };
    };

    // TODO check for Retracted event
    const checkBestBlockIncluded = async (block: PinnedBlock) => {
      const inBlock = await checkIsInBlock(block.hash);
      if (!inBlock) return;

      const { index: txIndex, events } = inBlock;

      callback(
        new SubmittableResult<IEventRecord, TransactionStatusV2>({
          status: { tag: 'BestChainBlockIncluded', value: { blockHash: block.hash, txIndex: txIndex } },
          txHash,
          events,
          txIndex,
        }),
      );
      api.chainHead.off('bestBlock', checkBestBlockIncluded);
    };

    const checkFinalizedBlockIncluded = async (block: PinnedBlock) => {
      const inBlock = await checkIsInBlock(block.hash);
      if (!inBlock) return;
      const { index: txIndex, events } = inBlock;

      callback(
        new SubmittableResult<IEventRecord, TransactionStatusV2>({
          status: { tag: 'Finalized', value: { blockHash: block.hash, txIndex: txIndex } },
          txHash,
          events,
          txIndex,
        }),
      );

      api.chainHead.off('finalizedBlock', checkFinalizedBlockIncluded);
    };

    const stopBroadcastFn = await api.txBroadcaster.broadcastTx(txHex);
    // TODO introduce a `Broadcasting` status after calling broadcastTx

    api.chainHead.on('bestBlock', checkBestBlockIncluded);
    api.chainHead.on('finalizedBlock', checkFinalizedBlockIncluded);

    return async () => {
      api.chainHead.off('bestBlock', checkBestBlockIncluded);
      api.chainHead.off('finalizedBlock', checkFinalizedBlockIncluded);
      stopBroadcastFn().catch(noop);
    };
  }

  send(): Promise<Hash>;
  send(callback: Callback): Promise<Unsub>;
  async send(callback?: Callback | undefined): Promise<Hash | Unsub> {
    const isSubscription = !!callback;

    if (isSubscription) {
      return this.#send(callback);
    } else {
      const defer = deferred<Hash>();

      try {
        // TODO handle timeout for this, just in-case we somehow can't find the tx in any block
        const unsub = await this.#send(({ status, txHash }) => {
          if (status.tag === 'BestChainBlockIncluded' || status.tag === 'Finalized') {
            defer.resolve(txHash);
            unsub().catch(noop);
          }
        });
      } catch (e: any) {
        defer.reject(e);
      }

      return defer.promise;
    }
  }
}
