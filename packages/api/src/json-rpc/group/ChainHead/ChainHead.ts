import { $Header, BlockHash, Option } from '@dedot/codecs';
import type { Subscription } from '@dedot/providers';
import type {
  ChainHeadRuntimeVersion,
  FollowEvent,
  FollowOperationEvent,
  MethodResponse,
  OperationId,
  RuntimeEvent,
  StorageQuery,
  StorageResult,
} from '@dedot/specs';
import type { AsyncMethod, Unsub } from '@dedot/types';
import { assert, Deferred, deferred, ensurePresence, HexString, noop, AsyncQueue, waitFor } from '@dedot/utils';
import type { IJsonRpcClient } from '../../../types.js';
import { JsonRpcGroup, type JsonRpcGroupOptions } from '../JsonRpcGroup.js';
import {
  ChainHeadBlockNotPinnedError,
  ChainHeadError,
  ChainHeadInvalidRuntimeError,
  ChainHeadLimitReachedError,
  ChainHeadOperationError,
  ChainHeadOperationInaccessibleError,
  ChainHeadStopError,
  RetryStrategy,
} from './error.js';

export type OperationHandler<T = any> = {
  operationId: OperationId;
  defer: Deferred<T>;
  storageResults?: Array<StorageResult>;
  hash: BlockHash; // block hash at which the operation is called
};

export type PinnedBlock = {
  hash: BlockHash;
  number: number;
  parent: BlockHash | undefined;
  runtime?: ChainHeadRuntimeVersion;
};

export type ChainHeadEvent =
  | 'newBlock'
  | 'bestBlock' // new best block
  | 'finalizedBlock'; // new best finalized block
// TODO handle: | 'bestChainChanged'; // new best chain, a fork happened

export const MIN_FINALIZED_QUEUE_SIZE = 10; // finalized queue size

export class ChainHead extends JsonRpcGroup<ChainHeadEvent> {
  #unsub?: Unsub;
  #subscriptionId?: string;

  #handlers: Record<OperationId, OperationHandler>;
  #pendingOperations: Record<OperationId, FollowOperationEvent[]>;

  #finalizedQueue: Array<BlockHash>;
  #pinnedBlocks: Record<BlockHash, PinnedBlock>;

  #bestHash?: BlockHash;
  #finalizedHash?: BlockHash; // best finalized hash
  #finalizedRuntime?: ChainHeadRuntimeVersion;
  #followResponseQueue: AsyncQueue;
  #retryQueue: AsyncQueue;
  #recovering?: Deferred<void>;

  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainHead', supportedVersions: ['unstable', 'v1'], ...options });
    this.#handlers = {};
    this.#pendingOperations = {};
    this.#pinnedBlocks = {};
    this.#finalizedQueue = [];
    this.#followResponseQueue = new AsyncQueue();
    this.#retryQueue = new AsyncQueue();
  }

  async runtimeVersion(): Promise<ChainHeadRuntimeVersion> {
    await this.#ensureFollowed();

    return this.#finalizedRuntime!;
  }

  async bestRuntimeVersion(): Promise<ChainHeadRuntimeVersion> {
    await this.#ensureFollowed();

    return this.#findRuntimeAt(this.#bestHash!) || this.runtimeVersion();
  }

  async finalizedHash(): Promise<BlockHash> {
    await this.#ensureFollowed();

    return this.#finalizedHash!;
  }

  async bestHash(): Promise<BlockHash> {
    await this.#ensureFollowed();

    return this.#bestHash!;
  }

  /**
   * chainHead_follow
   */
  async follow(): Promise<void> {
    assert(!this.#subscriptionId, 'Already followed chain head. Please unfollow first.');
    return this.#doFollow();
  }

  async #doFollow(): Promise<void> {
    const defer = deferred<void>();

    try {
      this.#unsub && this.#unsub().catch(noop); // ensure unfollowed

      this.#unsub = await this.send('follow', true, (event: FollowEvent, subscription: Subscription) => {
        this.#followResponseQueue.enqueue(async () => {
          await this.#onFollowEvent(event, subscription);

          if (event.event == 'initialized') {
            defer.resolve();
          }
        });
      });
    } catch (e: any) {
      defer.reject(e);
    }

    return defer.promise;
  }

  #onFollowEvent = async (result: FollowEvent, subscription?: Subscription) => {
    switch (result.event) {
      case 'initialized': {
        const { finalizedBlockHashes = [], finalizedBlockHash, finalizedBlockRuntime } = result;
        if (finalizedBlockHash) finalizedBlockHashes.push(finalizedBlockHash);

        this.#subscriptionId = subscription!.subscriptionId;
        this.#finalizedQueue = finalizedBlockHashes;

        this.#finalizedRuntime = this.#extractRuntime(finalizedBlockRuntime)!;
        this.#bestHash = this.#finalizedHash = finalizedBlockHashes.at(-1);

        this.#pinnedBlocks = finalizedBlockHashes.reduce(
          (o, hash, idx, arr) => {
            o[hash] = { hash, parent: arr[idx - 1], number: idx };
            return o;
          },
          {} as Record<BlockHash, PinnedBlock>,
        );

        const header = $Header.tryDecode(await this.#getHeader(finalizedBlockHashes[0]));
        Object.values(this.#pinnedBlocks).forEach((b, idx) => {
          b.number += header.number;
          if (idx === 0) {
            b.parent = header.parentHash;
          }
        });

        break;
      }
      case 'newBlock': {
        const { blockHash: hash, parentBlockHash: parent, newRuntime } = result;
        const runtime = this.#extractRuntime(newRuntime);

        const parentBlock = this.getPinnedBlock(parent)!;
        this.#pinnedBlocks[hash] = { hash, parent, runtime, number: parentBlock.number + 1 };

        this.emit('newBlock', this.#pinnedBlocks[hash]);
        break;
      }
      case 'bestBlockChanged': {
        // TODO detect bestChainChanged, the new bestBlockHash could lead to a fork
        this.#bestHash = result.bestBlockHash;

        this.emit('bestBlock', this.getPinnedBlock(this.#bestHash));
        break;
      }
      case 'finalized': {
        const { finalizedBlockHashes, prunedBlockHashes } = result;
        this.#finalizedHash = finalizedBlockHashes.at(-1)!;
        const finalizedRuntime = this.#findRuntimeAt(this.#finalizedHash)!;
        if (finalizedRuntime) {
          this.#finalizedRuntime = finalizedRuntime;
        }

        // push new finalized hashes into the queue, we'll adjust the size later if needed
        finalizedBlockHashes.forEach((hash) => {
          if (this.#finalizedQueue.includes(hash)) return;
          this.#finalizedQueue.push(hash);
        });

        this.emit('finalizedBlock', this.getPinnedBlock(this.#finalizedHash));

        // TODO check if there is any on-going operations on the pruned blocks, there are 2 options:
        //      1. we can need to wait for the operation to complete before unpinning the block
        //      2. or cancel them right away since if they are not needed anymore
        // TODO find all descendants of the pruned blocks and unpin them as well
        const finalizedBlockHeights = finalizedBlockHashes.map((hash) => this.getPinnedBlock(hash)!.number);
        const hashesToUnpin = new Set([
          ...prunedBlockHashes,
          // Since we have the current finalized blocks,
          // we can mark all the other blocks at the same height as pruned and unpin all together with the reported pruned blocks
          ...Object.values(this.#pinnedBlocks)
            .filter((b) => finalizedBlockHeights.includes(b.number))
            .filter((b) => !finalizedBlockHashes.includes(b.hash))
            .map((b) => b.hash),
        ]);

        hashesToUnpin.forEach((hash) => {
          if (!this.#isPinnedHash(hash)) return;
          delete this.#pinnedBlocks[hash];
        });

        // Unpin the oldest finalized pinned blocks to maintain the queue size
        if (this.#finalizedQueue.length > MIN_FINALIZED_QUEUE_SIZE) {
          const numOfItemsToUnpin = this.#finalizedQueue.length - MIN_FINALIZED_QUEUE_SIZE;
          const queuedHashesToUnpin = this.#finalizedQueue.splice(0, numOfItemsToUnpin);
          queuedHashesToUnpin.forEach((hash) => {
            delete this.#pinnedBlocks[hash];
            hashesToUnpin.add(hash);
          });
        }

        this.unpin([...hashesToUnpin]).catch(noop);
        break;
      }
      case 'stop': {
        // 1. First thing, set up the #recovering promise
        // So any requests/operations coming to the chainHead should be put on waiting
        // for the #recovering promise to resolve
        this.#recovering = deferred<void>();

        // 2. Attempt to re-follow the chainHead
        this.#doFollow()
          .then(() => {
            // 3. Resolve the recovering promise
            // This means to continue all pending requests while the chainHead started recovering mode at step 1.
            this.#recovering!.resolve();

            // 4. Recover stale operations
            // 4.1. Operations that's going on & waiting to receiving its operationId
            //     will eventually get an `limitedReached` error for using a stale followSubscriptionId
            //     these operation will automatically be recovered via the #retryQueue
            //     after the chainHead is re-followed & the #recovering promise is resolved
            // 4.2. Operations that's already received an operationId, is waiting for its response
            //     will not receive any data, we'll throw a ChainHeadStopError to trigger retrying via the #retryQueue
            Object.values(this.#handlers).forEach(({ defer, operationId }) => {
              defer.reject(new ChainHeadStopError('ChainHead subscription stopped!'));
              delete this.#handlers[operationId];
            });
          })
          .catch((e: any) => {
            console.error(e);
            // TODO we should retry a few attempts
            this.#recovering!.reject(new ChainHeadError('Cannot recover from stop event!'));

            Object.values(this.#handlers).forEach(({ defer, operationId }) => {
              defer.reject(new ChainHeadError('Cannot recover from stop event!'));
              delete this.#handlers[operationId];
            });
          })
          .finally(() => {
            // cleaning up
            waitFor().then(() => {
              this.#recovering = undefined;
            });
          });
        break;
      }
      case 'operationBodyDone': {
        this.#handleOperationResponse(result, ({ defer }) => {
          defer.resolve(result.value);
        });
        break;
      }
      case 'operationCallDone': {
        this.#handleOperationResponse(result, ({ defer }) => {
          defer.resolve(result.output);
        });
        break;
      }
      case 'operationStorageItems': {
        this.#handleOperationResponse(
          result,
          (handler) => {
            if (!handler.storageResults) handler.storageResults = [];
            handler.storageResults.push(...result.items);
          },
          false,
        );
        break;
      }
      case 'operationStorageDone': {
        this.#handleOperationResponse(result, ({ defer, storageResults }) => {
          defer.resolve(storageResults || []);
        });
        break;
      }
      case 'operationError': {
        this.#handleOperationResponse(result, ({ defer }) => {
          defer.reject(new ChainHeadOperationError(result.error));
        });
        break;
      }
      case 'operationInaccessible': {
        this.#handleOperationResponse(result, ({ defer }) => {
          defer.reject(new ChainHeadOperationInaccessibleError('Operation Inaccessible'));
        });
        break;
      }
      case 'operationWaitingForContinue': {
        this.continue(result.operationId).catch(noop);
        break;
      }
    }
  };

  getPinnedBlock(hash: BlockHash): PinnedBlock | undefined {
    return this.#pinnedBlocks[hash];
  }

  #findRuntimeAt(at: BlockHash): ChainHeadRuntimeVersion | undefined {
    return this.getPinnedBlock(at)?.runtime;
  }

  #isPinnedHash(hash: BlockHash): boolean {
    return !!this.getPinnedBlock(hash);
  }

  #ensurePinnedHash(hash?: BlockHash): BlockHash {
    if (hash) {
      if (this.#isPinnedHash(hash)) {
        return hash;
      } else {
        throw new ChainHeadBlockNotPinnedError(`Block hash ${hash} is not pinned`);
      }
    }

    return ensurePresence(this.#bestHash || this.#finalizedHash);
  }

  #getOperationHandler(result: FollowOperationEvent): OperationHandler | undefined {
    const handler = this.#handlers[result.operationId];
    if (handler) return handler;

    // Register pending operations
    if (!this.#pendingOperations[result.operationId]) {
      this.#pendingOperations[result.operationId] = [];
    }

    this.#pendingOperations[result.operationId].push(result);
  }

  #handleOperationResponse(
    result: FollowOperationEvent,
    handle: (handler: OperationHandler) => void,
    cleanUp: boolean = true,
  ) {
    const handler = this.#getOperationHandler(result);
    if (!handler) return;

    handle(handler);

    if (cleanUp) {
      this.#cleanUpOperation(result.operationId);
    }
  }

  #extractRuntime(runtimeEvent: RuntimeEvent | null) {
    if (!runtimeEvent) return;

    if (runtimeEvent.type == 'valid') {
      return runtimeEvent.spec;
    } else {
      // TODO: handle invalid runtime
      throw new ChainHeadInvalidRuntimeError(runtimeEvent.error);
    }
  }

  /**
   * chainHead_unfollow
   */
  async unfollow(): Promise<void> {
    await this.#ensureFollowed();

    this.#unsub && (await this.#unsub());
    this.#cleanUp();
  }

  #cleanUp() {
    this.off('newBlock');
    this.off('bestBlock');
    this.off('finalizedBlock');

    this.#subscriptionId = undefined;
    this.#unsub = undefined;
    this.#handlers = {};
    this.#pendingOperations = {};

    this.#pinnedBlocks = {};
    this.#bestHash = undefined;
    this.#finalizedHash = undefined;
    this.#finalizedRuntime = undefined;
    this.#followResponseQueue.clear();
    this.#retryQueue.clear();
  }

  async #ensureFollowed(): Promise<void> {
    if (this.#recovering) {
      await this.#recovering.promise;
    }

    assert(this.#subscriptionId, 'Please call the .follow() method before invoking any other methods in this group.');
  }

  #cleanUpOperation(operationId: OperationId) {
    delete this.#handlers[operationId];
    this.stopOperation(operationId).catch(noop);
  }

  async #performOperationWithRetry<T = any>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (e) {
      if (e instanceof ChainHeadError && e.retryStrategy) {
        return this.#retryOperation(e.retryStrategy, operation);
      }

      throw e;
    }
  }

  async #retryOperation(strategy: RetryStrategy, retry: AsyncMethod): Promise<any> {
    try {
      return await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (strategy === RetryStrategy.NOW) {
            retry().then(resolve).catch(reject);
          } else if (strategy === RetryStrategy.QUEUED) {
            this.#retryQueue.enqueue(retry).then(resolve).catch(reject);
          } else {
            throw new Error('Invalid retry strategy');
          }
        }); // retry again in the next tick
      });
    } catch (e: any) {
      // retry again until success, TODO we might need to limit the number of retries
      if (e instanceof ChainHeadError && e.retryStrategy) {
        return this.#retryOperation(e.retryStrategy, retry);
      }

      throw e;
    }
  }

  #awaitOperation<T = any>(resp: MethodResponse, hash: BlockHash): Promise<T> {
    if (resp.result === 'limitReached') {
      throw new ChainHeadLimitReachedError('Limit reached');
    }

    const defer = deferred<T>();

    this.#handlers[resp.operationId] = {
      operationId: resp.operationId,
      defer,
      hash,
    };

    // Resolve pending operations
    if (this.#pendingOperations[resp.operationId]) {
      this.#pendingOperations[resp.operationId].forEach((one) => {
        this.#onFollowEvent(one);
      });

      delete this.#pendingOperations[resp.operationId];
    }

    return defer.promise;
  }

  /**
   * chainHead_body
   */
  async body(at?: BlockHash): Promise<Array<HexString>> {
    await this.#ensureFollowed();
    const atHash = this.#ensurePinnedHash(at);

    const operation = async (): Promise<Array<HexString>> => {
      await this.#ensureFollowed();
      const hash = this.#ensurePinnedHash(atHash);

      const resp: MethodResponse = await this.send('body', this.#subscriptionId, hash);
      return this.#awaitOperation(resp, hash);
    };

    return this.#performOperationWithRetry(operation);
  }

  /**
   * chainHead_call
   */
  async call(func: string, params: HexString = '0x', at?: BlockHash): Promise<HexString> {
    await this.#ensureFollowed();
    const atHash = this.#ensurePinnedHash(at);

    const operation = async (): Promise<HexString> => {
      await this.#ensureFollowed();
      const hash = this.#ensurePinnedHash(atHash);

      const resp: MethodResponse = await this.send('call', this.#subscriptionId, hash, func, params);
      return this.#awaitOperation(resp, hash);
    };

    return this.#performOperationWithRetry(operation);
  }

  /**
   * chainHead_header
   */
  async header(at?: BlockHash): Promise<Option<HexString>> {
    await this.#ensureFollowed();

    return this.#getHeader(this.#ensurePinnedHash(at));
  }

  async #getHeader(at: BlockHash): Promise<Option<HexString>> {
    return await this.send('header', this.#subscriptionId, at);
  }

  /**
   * chainHead_storage
   * TODO on a large number of items, best hash might change a long the way
   *      we might ended up running query on a pruned block, we need to handle this
   */
  async storage(items: Array<StorageQuery>, childTrie?: string | null, at?: BlockHash): Promise<Array<StorageResult>> {
    await this.#ensureFollowed();

    const hash = this.#ensurePinnedHash(at);
    const results: Array<StorageResult> = [];

    let queryItems = items;
    while (queryItems.length > 0) {
      const [newBatch, newDiscardedItems] = await this.#getStorage(queryItems, childTrie ?? null, hash);
      results.push(...newBatch);
      queryItems = newDiscardedItems;
    }

    return results;
  }

  async #getStorage(
    items: Array<StorageQuery>,
    childTrie: string | null,
    at: BlockHash,
  ): Promise<[fetchedResults: Array<StorageResult>, discardedItems: Array<StorageQuery>]> {
    const operation = () => this.#getStorageOperation(items, childTrie, this.#ensurePinnedHash(at));

    return this.#performOperationWithRetry(operation);
  }

  async #getStorageOperation(
    items: Array<StorageQuery>,
    childTrie: string | null,
    at: BlockHash,
  ): Promise<[fetchedResults: Array<StorageResult>, discardedItems: Array<StorageQuery>]> {
    await this.#ensureFollowed();

    const resp: MethodResponse = await this.send('storage', this.#subscriptionId, at, items, childTrie);

    let discardedItems: Array<StorageQuery> = [];
    if (resp.result === 'started' && resp.discardedItems && resp.discardedItems > 0) {
      discardedItems = items.slice(items.length - resp.discardedItems);
    }

    return [await this.#awaitOperation(resp, at), discardedItems];
  }

  /**
   * chainHead_stopOperation
   */
  protected async stopOperation(operationId: OperationId): Promise<void> {
    await this.#ensureFollowed();

    await this.send('stopOperation', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_continue
   */
  protected async continue(operationId: OperationId): Promise<void> {
    await this.#ensureFollowed();

    await this.send('continue', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unpin
   */
  protected async unpin(hashes: BlockHash | BlockHash[]): Promise<void> {
    await this.#ensureFollowed();

    if (Array.isArray(hashes) && hashes.length === 0) return;

    await this.send('unpin', this.#subscriptionId, hashes);
  }
}
