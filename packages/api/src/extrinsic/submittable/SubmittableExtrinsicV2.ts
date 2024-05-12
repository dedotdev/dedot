import type { BlockHash, Hash } from '@dedot/codecs';
import type {
  Callback,
  IEventRecord,
  IRuntimeTxCall,
  ISubmittableResult,
  TransactionStatusV2,
  Unsub,
} from '@dedot/types';
import { AsyncQueue, deferred, noop } from '@dedot/utils';
import { DedotClient } from '../../client/index.js';
import { PinnedBlock } from '../../json-rpc/index.js';
import { BaseSubmittableExtrinsic } from './BaseSubmittableExtrinsic.js';
import { SubmittableResult } from './SubmittableResult.js';
import { InvalidTxError } from './errors.js';

type TxFound = { blockHash: BlockHash; index: number; events: IEventRecord[] };

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
    const finalizedHash = await this.api.chainHead.finalizedHash();
    const validateTx = async (hash: BlockHash) => {
      const apiAt = await api.at(hash);
      return apiAt.call.taggedTransactionQueue.validateTransaction('External', txHex, hash);
    };

    const validateResult = await validateTx(finalizedHash);

    if (validateResult.isOk) {
      callback(new SubmittableResult({ status: { tag: 'Validated' }, txHash }));
    } else if (validateResult.isErr) {
      throw new InvalidTxError(
        `Invalid Tx: ${validateResult.err.tag} - ${validateResult.err.value.tag}`,
        validateResult,
      );
    }

    const checkTxIsOnChain = async (blockHash: BlockHash): Promise<TxFound | undefined> => {
      if (blockHash === finalizedHash) return;

      const txs = await api.chainHead.body(blockHash);
      const txIndex = txs.indexOf(txHex);
      if (txIndex < 0) {
        return checkTxIsOnChain(api.chainHead.findBlock(blockHash)!.parent);
      }

      const events = await this.getSystemEventsAt(blockHash);
      const txEvents = events.filter(({ phase }) => phase.tag == 'ApplyExtrinsic' && phase.value === txIndex);

      return {
        blockHash,
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
              new SubmittableResult<IEventRecord, TransactionStatusV2>({
                status: { tag: 'NoLongerInBestChain' },
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

        const { index: txIndex, events, blockHash } = inBlock;

        callback(
          new SubmittableResult<IEventRecord, TransactionStatusV2>({
            status: { tag: 'BestChainBlockIncluded', value: { blockHash, txIndex } },
            txHash,
            events,
            txIndex,
          }),
        );
      } catch {
        // ignore this!
      } finally {
        isSearching = false;
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
        const { index: txIndex, events, blockHash } = inBlock;

        callback(
          new SubmittableResult<IEventRecord, TransactionStatusV2>({
            status: { tag: 'Finalized', value: { blockHash, txIndex } },
            txHash,
            events,
            txIndex,
          }),
        );
      } else {
        // Revalidate the tx, just in-case it becomes invalid along the way
        // Context: https://github.com/paritytech/json-rpc-interface-spec/pull/107#issuecomment-1906008814
        const validated = await validateTx(block.hash);
        if (validated.isOk) return;

        callback(
          new SubmittableResult<IEventRecord, TransactionStatusV2>({
            status: {
              tag: 'Invalid',
              value: { error: `Invalid Tx: ${validated.err.tag} - ${validated.err.value.tag}` },
            },
            txHash,
          }),
        );
      }

      txUnsub().catch(noop);
    };

    // If we do search body after submitting the transaction,
    // there is a slight chance that the tx is included inside a block emitted
    // during the time we're waiting for the response of the broadcastTx request
    // So we'll do body search a head of time for now!
    api.chainHead.on('bestBlock', checkBestBlockIncluded);
    api.chainHead.on('finalizedBlock', checkFinalizedBlockIncluded);

    const stopTracking = () => {
      api.chainHead.off('bestBlock', checkBestBlockIncluded);
      api.chainHead.off('finalizedBlock', checkFinalizedBlockIncluded);

      cancelBodySearch();
    };

    try {
      stopBroadcastFn = await api.txBroadcaster.broadcastTx(txHex);
      callback(
        new SubmittableResult<IEventRecord, TransactionStatusV2>({
          status: { tag: 'Broadcasting' },
          txHash,
        }),
      );

      txUnsub = async () => {
        stopTracking();
        stopBroadcast();
      };

      return txUnsub;
    } catch (e: any) {
      stopTracking();

      throw e;
    }
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
        // TODO handle timeout for this with the Drop status, just in-case we somehow can't find the tx in any block
        const unsub = await this.#send(({ status, txHash }) => {
          if (status.tag === 'BestChainBlockIncluded' || status.tag === 'Finalized') {
            defer.resolve(txHash);
            unsub().catch(noop);
          } else if (status.tag === 'Invalid' || status.tag === 'Drop') {
            defer.reject(new Error(status.value.error));
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