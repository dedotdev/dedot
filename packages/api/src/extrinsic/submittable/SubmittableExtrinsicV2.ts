import type { BlockHash } from '@dedot/codecs';
import { Callback, IEventRecord, IRuntimeTxCall, ISubmittableResult, TxHash, TxUnsub, Unsub } from '@dedot/types';
import { AsyncQueue, noop } from '@dedot/utils';
import { DedotClient } from '../../client/index.js';
import { PinnedBlock } from '../../json-rpc/index.js';
import { BaseSubmittableExtrinsic } from './BaseSubmittableExtrinsic.js';
import { SubmittableResult } from './SubmittableResult.js';
import { InvalidTxError } from './errors.js';
import { txDefer } from './utils.js';

type TxFound = { blockHash: BlockHash; blockNumber: number; index: number; events: IEventRecord[] };

/**
 * @name SubmittableExtrinsicV2
 * @description Submittable extrinsic based on JSON-RPC v2
 */
export class SubmittableExtrinsicV2 extends BaseSubmittableExtrinsic {
  constructor(
    public client: DedotClient,
    call: IRuntimeTxCall,
  ) {
    super(client, call);
  }

  async #send(callback: Callback<ISubmittableResult>): Promise<Unsub> {
    const api = this.client;
    const txHex = this.toHex();
    const txHash = this.hash;

    // validate the transaction
    // https://github.com/paritytech/json-rpc-interface-spec/issues/55#issuecomment-1609011150
    const finalizedHash = await this.client.chainHead.finalizedHash();
    const validateTx = async (hash: BlockHash) => {
      const apiAt = await api.at(hash);
      return apiAt.call.taggedTransactionQueue.validateTransaction('External', txHex, hash);
    };

    const validation = await validateTx(finalizedHash);

    if (validation.isOk) {
      callback(new SubmittableResult({ status: { type: 'Validated' }, txHash }));
    } else if (validation.isErr) {
      throw new InvalidTxError(`Invalid Tx: ${validation.err.type} - ${validation.err.value.type}`, validation);
    }

    const checkTxIsOnChain = async (blockHash: BlockHash): Promise<TxFound | undefined> => {
      if (blockHash === finalizedHash) return;

      const block = api.chainHead.findBlock(blockHash)!;
      const txs = await api.chainHead.body(blockHash);
      const txIndex = txs.indexOf(txHex);

      if (txIndex < 0) {
        return checkTxIsOnChain(block.parent);
      }

      const events = await this.getSystemEventsAt(blockHash);
      const txEvents = events.filter(({ phase }) => phase.type == 'ApplyExtrinsic' && phase.value === txIndex);

      return {
        blockHash,
        blockNumber: block.number,
        index: txIndex,
        events: txEvents,
      };
    };

    let txFound: TxFound | undefined;
    let isSearching = false;
    let searchQueue: AsyncQueue = new AsyncQueue();

    // TODO 1. move the searching logic into a different utility
    //      2. properly cancel the work by actually cancel the on-going operations
    const cancelPendingSearch = () => {
      searchQueue.clear();
    };

    const cancelBodySearch = () => {
      searchQueue.cancel();
    };

    const startSearching = (block: PinnedBlock): Promise<TxFound | undefined> => {
      return searchQueue.enqueue(async () => {
        const found = await checkTxIsOnChain(block.hash);
        if (found) {
          cancelPendingSearch();
        }

        return found;
      });
    };

    const checkBestBlockIncluded = async (block: PinnedBlock, bestChainChanged: boolean) => {
      if (bestChainChanged) {
        if (isSearching) {
          // if the best chain is changing, we cancel the current search
          // and start searching on the current best chain
          cancelBodySearch();
        }
      } else {
        if (txFound) return;
      }

      try {
        isSearching = true;
        const inBlock = await startSearching(block);

        if (!inBlock) {
          if (txFound && bestChainChanged) {
            txFound = undefined;
            callback(
              new SubmittableResult<IEventRecord>({
                status: { type: 'NoLongerInBestChain' },
                txHash,
              }),
            );
          }

          return;
        }

        if (txFound && bestChainChanged) {
          if (txFound.blockHash === inBlock.blockHash) return;
        }

        txFound = inBlock;

        const { index: txIndex, events, blockHash, blockNumber } = inBlock;

        callback(
          new SubmittableResult<IEventRecord>({
            status: { type: 'BestChainBlockIncluded', value: { blockHash, blockNumber, txIndex } },
            txHash,
            events,
            txIndex,
          }),
        );
      } catch {
        // ignore this!
      } finally {
        if (searchQueue.size === 0 && !searchQueue.isWorking) {
          isSearching = false;
        }
      }
    };

    let txUnsub: Unsub;
    // This whole thing is just to make sure
    // that we're not calling stopBroadcastFn twice
    let stopBroadcastFn: Unsub;
    let stopped = false;
    const stopBroadcast = () => {
      if (stopped) return;

      if (stopBroadcastFn) {
        stopped = true;
        stopBroadcastFn().catch(noop);
      }
    };

    const checkFinalizedBlockIncluded = async (block: PinnedBlock) => {
      const inBlock = await checkTxIsOnChain(block.hash);
      if (inBlock) {
        const { index: txIndex, events, blockHash, blockNumber } = inBlock;

        callback(
          new SubmittableResult<IEventRecord>({
            status: { type: 'Finalized', value: { blockHash, blockNumber, txIndex } },
            txHash,
            events,
            txIndex,
          }),
        );
      } else {
        // Revalidate the tx, just in-case it becomes invalid along the way
        // Context: https://github.com/paritytech/json-rpc-interface-spec/pull/107#issuecomment-1906008814
        const validation = await validateTx(block.hash);
        if (validation.isOk) return;

        callback(
          new SubmittableResult<IEventRecord>({
            status: {
              type: 'Invalid',
              value: { error: `Invalid Tx: ${validation.err.type} - ${validation.err.value.type}` },
            },
            txHash,
          }),
        );
      }

      txUnsub().catch(noop);
    };

    stopBroadcastFn = await api.txBroadcaster.broadcastTx(txHex);
    callback(
      new SubmittableResult<IEventRecord>({
        status: { type: 'Broadcasting' },
        txHash,
      }),
    );

    const stopBestBlockTrackingFn = api.on('bestBlock', checkBestBlockIncluded);
    const stopFinalizedBlockTrackingFn = api.on('finalizedBlock', checkFinalizedBlockIncluded);

    const stopTracking = () => {
      stopBestBlockTrackingFn();
      stopFinalizedBlockTrackingFn();

      cancelBodySearch();
    };

    txUnsub = async () => {
      stopTracking();
      stopBroadcast();
    };

    return txUnsub;
  }

  send(): TxHash;
  send(callback: Callback): TxUnsub;
  send(callback?: Callback | undefined) {
    const isSubscription = !!callback;

    const { deferTx, onTxProgress } = txDefer();

    // TODO handle timeout for this with the Drop status,
    //  just in-case we somehow can't find the tx in any block
    let unsub: Unsub | undefined;
    this.#send((result) => {
      onTxProgress(result);

      if (isSubscription) {
        try {
          callback?.(result);
        } catch {}

        return;
      }

      const { status, txHash } = result;
      if (
        status.type === 'BestChainBlockIncluded' ||
        status.type === 'Finalized' ||
        status.type === 'Invalid' ||
        status.type === 'Drop'
      ) {
        deferTx.resolve(txHash);
        unsub?.().catch(noop);
      }
    })
      .then((x) => {
        unsub = x;

        isSubscription && deferTx.resolve(unsub);
      })
      .catch(deferTx.reject);

    return deferTx.promise;
  }
}
