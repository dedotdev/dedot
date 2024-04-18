import { BlockHash, Hash } from '@dedot/codecs';
import { BaseExtrinsic } from './BaseExtrinsic.js';
import { type Callback, type IEventRecord, IRuntimeTxCall, ISubmittableResult, type Unsub } from '@dedot/types';
import { DedotClient } from '../client/index.js';
import { deferred, noop } from '@dedot/utils';
import { SubmittableResult } from './SubmittableResult.js';
import { TransactionEvent } from '@dedot/specs';

export class SubmittableExtrinsicV2 extends BaseExtrinsic {
  constructor(
    public api: DedotClient,
    call: IRuntimeTxCall,
  ) {
    super(api, call);
  }

  async #send(callback: Callback<ISubmittableResult<IEventRecord, TransactionEvent>>): Promise<Unsub> {
    const api = this.api;
    const txHex = this.toHex();
    const txHash = this.hash;

    // validate the transaction
    // https://github.com/paritytech/json-rpc-interface-spec/issues/55#issuecomment-1609011150
    const validateResult = await api
      .callAt(api.chainHead.bestHash)
      .taggedTransactionQueue.validateTransaction('External', txHex, api.chainHead.bestHash);

    if (validateResult.isOk) {
      // @ts-ignore
      callback(new SubmittableResult({ status: { event: 'validated' }, txHash }));
    } else if (validateResult.isErr) {
      // TODO Add Invalid Transaction Error
      console.error(validateResult.err);
      throw new Error(`Invalid transaction: ${validateResult.err.tag} - ${validateResult.err.value.tag}`);
    }

    const checkIsInBlock = async (
      newHash: BlockHash,
    ): Promise<{ index: number; events: IEventRecord[] } | undefined> => {
      const txs = await api.chainHead.body(newHash);
      const txIndex = txs.findIndex((tx) => this.registry.hashAsHex(tx) === txHash);
      if (txIndex < 0) return;

      const events = await api.queryAt(newHash).system.events();
      const txEvents = events.filter(({ phase }) => phase.tag == 'ApplyExtrinsic' && phase.value === txIndex);

      return {
        index: txIndex,
        events: txEvents,
      };
    };

    const checkBestBlockIncluded = async (newHash: BlockHash) => {
      const inBlock = await checkIsInBlock(newHash);
      if (!inBlock) return;

      const { index: txIndex, events } = inBlock;

      callback(
        new SubmittableResult<IEventRecord, TransactionEvent>({
          status: { event: 'bestChainBlockIncluded', block: { hash: newHash, index: txIndex } },
          txHash,
          events,
          txIndex,
        }),
      );
      api.chainHead.off('bestBlock', checkBestBlockIncluded);
    };

    const checkFinalizedBlockIncluded = async (newHash: BlockHash) => {
      const inBlock = await checkIsInBlock(newHash);
      if (!inBlock) return;
      const { index: txIndex, events } = inBlock;

      callback(
        new SubmittableResult<IEventRecord, TransactionEvent>({
          status: { event: 'finalized', block: { hash: newHash, index: txIndex } },
          txHash,
          events,
          txIndex,
        }),
      );

      api.chainHead.off('finalizedBlock', checkFinalizedBlockIncluded);
    };

    api.chainHead.on('bestBlock', checkBestBlockIncluded);
    api.chainHead.on('finalizedBlock', checkFinalizedBlockIncluded);

    const stopBroadcastFn = await api.txBroadcaster.broadcastTx(txHex);

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
          if (status.event === 'bestChainBlockIncluded' || status.event === 'finalized') {
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
