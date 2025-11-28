import type { BlockHash } from '@dedot/codecs';
import { Callback, IEventRecord, IRuntimeTxCall, ISubmittableResult, TxHash, TxUnsub, Unsub } from '@dedot/types';
import { AsyncQueue, noop, waitFor } from '@dedot/utils';
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
    public client: DedotClient<any>,
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
    // ensure at least 2 finalized blocks, this is to make sure the api.at can find the parent hash & block to fetch runtime
    while (true) {
      const block = await this.client.chainHead.finalizedBlock();
      const parentBlock = this.client.chainHead.findBlock(block.parent);
      if (parentBlock) {
        break;
      }
      await waitFor(100);
    }

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
    const searchQueue: AsyncQueue = new AsyncQueue();
    const finalizedQueue: AsyncQueue = new AsyncQueue();
    const trackedHashes: BlockHash[] = [];

    const cancelPendingSearch = () => {
      searchQueue.clear();
    };

    const cancelBodySearch = () => {
      searchQueue.cancel();
    };

    const startSearching = async (block: PinnedBlock): Promise<TxFound | undefined> => {
      const hash = block.hash;
      if (!trackedHashes.includes(hash)) {
        api.chainHead.holdBlock(hash);
        trackedHashes.push(hash);
      }

      return searchQueue
        .enqueue(async () => {
          const found = await checkTxIsOnChain(hash);
          if (found) {
            cancelPendingSearch();
          }

          return found;
        })
        .catch(() => undefined);
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
      const hash = block.hash;
      if (!trackedHashes.includes(hash)) {
        api.chainHead.holdBlock(hash);
        trackedHashes.push(hash);
      }

      finalizedQueue
        .enqueue(async () => {
          const inBlock = await checkTxIsOnChain(hash);
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
            const validation = await validateTx(hash);
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
        })
        .catch(noop);
    };

    const stopBestBlockTrackingFn = api.on('bestBlock', checkBestBlockIncluded);
    const stopFinalizedBlockTrackingFn = api.on('finalizedBlock', checkFinalizedBlockIncluded);

    stopBroadcastFn = await api.txBroadcaster.broadcastTx(txHex);
    callback(
      new SubmittableResult<IEventRecord>({
        status: { type: 'Broadcasting' },
        txHash,
      }),
    );

    const stopTracking = () => {
      stopBestBlockTrackingFn();
      stopFinalizedBlockTrackingFn();

      cancelBodySearch();
      finalizedQueue.cancel();
      trackedHashes.forEach((h) => {
        api.chainHead.releaseBlock(h);
      });
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

    let trackingTimer: NodeJS.Timeout | undefined;

    let unsub: Unsub | undefined;

    const onProgress = (result: ISubmittableResult) => {
      result = this.transformTxResult(result);

      onTxProgress(result);

      const { status, txHash } = result;

      if (trackingTimer) {
        clearTimeout(trackingTimer);
        trackingTimer = undefined;
      }

      if (
        status.type === 'Validated' || // --
        status.type === 'Broadcasting'
      ) {
        trackingTimer = setTimeout(() => {
          onProgress(
            new SubmittableResult<IEventRecord>({
              status: { type: 'Drop', value: { error: 'Unable to track the transaction’s progress' } },
              txHash,
            }),
          );
        }, 60_000 * 2);
      }

      if (isSubscription) {
        try {
          callback?.(result);
        } catch {}
      }

      if (
        status.type === 'BestChainBlockIncluded' ||
        status.type === 'Finalized' ||
        status.type === 'Invalid' ||
        status.type === 'Drop'
      ) {
        !isSubscription && deferTx.resolve(txHash);

        // Unsub the subscription if we're at the final states
        if (status.type !== 'BestChainBlockIncluded') {
          unsub?.().catch(noop);
        }
      }
    };

    this.#send(onProgress)
      .then((x) => {
        unsub = x;

        isSubscription && deferTx.resolve(unsub);
      })
      .catch(deferTx.reject);

    return deferTx.promise;
  }
}
