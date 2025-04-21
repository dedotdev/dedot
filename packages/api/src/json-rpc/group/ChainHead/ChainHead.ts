import { $Header, BlockHash, Option } from '@dedot/codecs';
import type { JsonRpcSubscription } from '@dedot/providers';
import type { AsyncMethod, Unsub } from '@dedot/types';
import type {
  ChainHeadRuntimeVersion,
  FollowEvent,
  FollowOperationEvent,
  MethodResponse,
  OperationId,
  RuntimeEvent,
  StorageQuery,
  StorageResult,
} from '@dedot/types/json-rpc';
import { assert, AsyncQueue, deferred, Deferred, ensurePresence, HexString, noop, waitFor } from '@dedot/utils';
import type { IJsonRpcClient } from '../../../types.js';
import { JsonRpcGroup, type JsonRpcGroupOptions } from '../JsonRpcGroup.js';
import { BlockUsage } from './BlockUsage.js';
import {
  ChainHeadBlockNotPinnedError,
  ChainHeadBlockPrunedError,
  ChainHeadError,
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
  parent: BlockHash;
  runtime?: ChainHeadRuntimeVersion;
};

export type ChainHeadEvent =
  | 'newBlock'
  | 'bestBlock' // new best block
  | 'finalizedBlock' // new best finalized block
  | 'bestChainChanged'; // new best chain, a fork happened

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
  #blockUsage: BlockUsage;
  #cache: Map<string, any>;

  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainHead', supportedVersions: ['unstable', 'v1'], ...options });
    this.#handlers = {};
    this.#pendingOperations = {};
    this.#pinnedBlocks = {};
    this.#finalizedQueue = [];
    this.#followResponseQueue = new AsyncQueue();
    this.#retryQueue = new AsyncQueue();
    this.#blockUsage = new BlockUsage();
    this.#cache = new Map();
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

  async bestBlock(): Promise<PinnedBlock> {
    return this.findBlock(await this.bestHash())!;
  }

  async finalizedBlock(): Promise<PinnedBlock> {
    return this.findBlock(await this.finalizedHash())!;
  }

  findBlock(hash: BlockHash): PinnedBlock | undefined {
    return this.#pinnedBlocks[hash];
  }

  isPinned(hash: BlockHash): boolean {
    return !!this.findBlock(hash);
  }

  /**
   * chainHead_unfollow
   */
  async unfollow(): Promise<void> {
    await this.#ensureFollowed();

    this.#unsub && (await this.#unsub());
    this.#cleanUp();
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

      this.#unsub = await this.send('follow', true, (event: FollowEvent, subscription: JsonRpcSubscription) => {
        this.#followResponseQueue
          .enqueue(async () => {
            await this.#onFollowEvent(event, subscription);

            if (event.event == 'initialized') {
              defer.resolve();
            }
          })
          .catch(console.error); // print this out for logging purpose
      });
    } catch (e: any) {
      defer.reject(e);
    }

    return defer.promise;
  }

  #onFollowEvent = async (result: FollowEvent, subscription?: JsonRpcSubscription) => {
    switch (result.event) {
      case 'initialized': {
        const { finalizedBlockHashes = [], finalizedBlockHash, finalizedBlockRuntime } = result;
        if (finalizedBlockHash) finalizedBlockHashes.push(finalizedBlockHash);

        this.#subscriptionId = subscription!.subscriptionId;
        this.#finalizedQueue = finalizedBlockHashes;

        this.#finalizedRuntime = this.#extractRuntime(finalizedBlockRuntime)!;
        assert(this.#finalizedRuntime, 'Invalid finalized runtime');

        this.#bestHash = this.#finalizedHash = finalizedBlockHashes.at(-1);

        this.#pinnedBlocks = finalizedBlockHashes.reduce(
          (o, hash, idx, arr) => {
            o[hash] = { hash, parent: arr[idx - 1], number: idx };

            // assign finalized runtime to the current finalized block
            if (idx === finalizedBlockHashes.length - 1) {
              o[hash]['runtime'] = this.#finalizedRuntime;
            }

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

        const parentBlock = this.findBlock(parent)!;
        assert(parentBlock, `Parent block not found for new block ${hash}`);

        this.#pinnedBlocks[hash] = {
          hash,
          parent,
          // if the runtime is not provided, we'll find it from the parent block
          runtime: runtime || this.#findRuntimeAt(parent),
          number: parentBlock.number + 1,
        };

        this.emit('newBlock', this.#pinnedBlocks[hash]);
        break;
      }
      case 'bestBlockChanged': {
        const { bestBlockHash } = result;
        const currentBestBlock = this.findBlock(this.#bestHash!)!;
        const newBestBlock = this.findBlock(bestBlockHash);

        if (!newBestBlock) return;
        if (currentBestBlock.hash === newBestBlock.hash) return;

        const bestChainChanged = !this.#onTheSameChain(currentBestBlock, newBestBlock);
        this.#bestHash = bestBlockHash;
        this.emit('bestBlock', newBestBlock, bestChainChanged);
        if (bestChainChanged) this.emit('bestChainChanged', newBestBlock);
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

        this.emit('finalizedBlock', this.findBlock(this.#finalizedHash));

        // TODO should we find all descendants of the pruned blocks and unpin them as well?
        //      that's probably a premature optimization
        const finalizedBlockHeights = finalizedBlockHashes.map((hash) => this.findBlock(hash)!.number);
        const pinnedHashes = Object.keys(this.#pinnedBlocks);
        const hashesToUnpin = new Set([
          ...prunedBlockHashes.filter((hash) => pinnedHashes.includes(hash)),
          // Since we have the current finalized blocks,
          // we can mark all the other blocks at the same height as pruned and unpin all together with the reported pruned blocks
          ...Object.values(this.#pinnedBlocks)
            .filter((b) => finalizedBlockHeights.includes(b.number))
            .filter((b) => !finalizedBlockHashes.includes(b.hash))
            .map((b) => b.hash),
        ]);

        // TODO account for operations that haven't received its operationId yet
        Object.values(this.#handlers).forEach(({ defer, hash, operationId }) => {
          if (hashesToUnpin.has(hash)) {
            defer.reject(new ChainHeadBlockPrunedError());
            this.stopOperation(operationId).catch(noop);
            delete this.#handlers[operationId];
          }
        });

        // Unpin the oldest finalized pinned blocks to maintain the queue size
        if (this.#finalizedQueue.length > MIN_FINALIZED_QUEUE_SIZE) {
          const finalizedQueue = this.#finalizedQueue.slice();
          const numOfItemsToUnpin = finalizedQueue.length - MIN_FINALIZED_QUEUE_SIZE;
          const queuedHashesToUnpin = finalizedQueue.splice(0, numOfItemsToUnpin);

          queuedHashesToUnpin.forEach((hash) => {
            // if the block is being used, we'll keep it pinned
            // and recheck it later in the next finalized event
            if (this.#blockUsage.usage(hash) > 0) {
              finalizedQueue.unshift(hash);
            } else {
              hashesToUnpin.add(hash);
            }
          });

          this.#finalizedQueue = finalizedQueue;
        }

        hashesToUnpin.forEach((hash) => {
          if (!this.isPinned(hash)) return;
          delete this.#pinnedBlocks[hash];

          // clear cache
          Array.from(this.#cache.keys())
            .filter((key) => key.startsWith(`${hash}::`))
            .forEach((key) => this.#cache.delete(key));
        });

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

  #findRuntimeAt(at: BlockHash): ChainHeadRuntimeVersion | undefined {
    const block = this.findBlock(at);

    if (!block) return undefined;

    const runtime = block.runtime;
    if (runtime) return runtime;

    if (this.#finalizedQueue.includes(at)) return;

    return this.#findRuntimeAt(block.parent!);
  }

  #onTheSameChain(b1: PinnedBlock | undefined, b2: PinnedBlock | undefined): boolean {
    if (!b1 || !b2) return false;

    if (b1.number === b2.number) {
      return b1.hash === b2.hash;
    } else if (b1.number < b2.number) {
      return this.#onTheSameChain(b1, this.findBlock(b2.parent));
    } else {
      return this.#onTheSameChain(this.findBlock(b1.parent), b2);
    }
  }

  #ensurePinnedHash(hash?: BlockHash): BlockHash {
    if (hash) {
      if (this.isPinned(hash)) {
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
      const newRuntimeVersion = runtimeEvent.spec;

      // fix inconsistent type of returned apis
      // in some network endpoints this newRuntimeVersion.apis is an array (maybe using an old version of the sdk)
      // here we convert it to a map format for consistency.
      if (Array.isArray(newRuntimeVersion.apis)) {
        newRuntimeVersion.apis = newRuntimeVersion.apis.reduce(
          (o, [name, version]) => {
            o[name] = version;
            return o;
          },
          {} as Record<string, number>,
        );
      }

      return newRuntimeVersion;
    }

    // If the runtime is invalid,
    // we safely return an undefined runtime for now
    console.error(runtimeEvent.error);
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
    this.#blockUsage.clear();
    this.#cache.clear();
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

  async #performOperationWithRetry<T = any>(operation: () => Promise<T>, hash: BlockHash): Promise<T> {
    try {
      this.#blockUsage.use(hash);

      return await operation();
    } catch (e) {
      if (e instanceof ChainHeadError && e.retryStrategy) {
        return await this.#retryOperation(e.retryStrategy, operation);
      }

      throw e;
    } finally {
      this.#blockUsage.release(hash);
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
        return await this.#retryOperation(e.retryStrategy, retry);
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
    const shouldRetryOnPrunedBlock = !at;

    try {
      const atHash = this.#ensurePinnedHash(at);
      const cacheKey = `${atHash}::body`;
      if (this.#cache.has(cacheKey)) {
        return this.#cache.get(cacheKey);
      }

      const operation = async (): Promise<Array<HexString>> => {
        await this.#ensureFollowed();
        const hash = this.#ensurePinnedHash(atHash);

        const resp: MethodResponse = await this.send('body', this.#subscriptionId, hash);
        return this.#awaitOperation(resp, hash);
      };

      const resp = await this.#performOperationWithRetry(operation, atHash);
      this.#cache.set(cacheKey, resp);
      return resp;
    } catch (e: any) {
      if (e instanceof ChainHeadBlockPrunedError && shouldRetryOnPrunedBlock) {
        return this.body();
      }

      throw e;
    }
  }

  /**
   * chainHead_call
   */
  async call(func: string, params: HexString = '0x', at?: BlockHash): Promise<HexString> {
    await this.#ensureFollowed();
    const shouldRetryOnPrunedBlock = !at;

    try {
      const atHash = this.#ensurePinnedHash(at);
      const cacheKey = `${atHash}::call::${func}::${params}`;
      if (this.#cache.has(cacheKey)) {
        return this.#cache.get(cacheKey);
      }

      const operation = async (): Promise<HexString> => {
        await this.#ensureFollowed();
        const hash = this.#ensurePinnedHash(atHash);

        const resp: MethodResponse = await this.send('call', this.#subscriptionId, hash, func, params);
        return this.#awaitOperation(resp, hash);
      };

      const resp = await this.#performOperationWithRetry(operation, atHash);
      this.#cache.set(cacheKey, resp);
      return resp;
    } catch (e: any) {
      if (e instanceof ChainHeadBlockPrunedError && shouldRetryOnPrunedBlock) {
        return this.call(func, params);
      }

      throw e;
    }
  }

  /**
   * chainHead_header
   */
  async header(at?: BlockHash): Promise<Option<HexString>> {
    await this.#ensureFollowed();

    const hash = this.#ensurePinnedHash(at);
    const cacheKey = `${hash}::header`;

    if (this.#cache.has(cacheKey)) {
      return this.#cache.get(cacheKey);
    }

    const resp = await this.#getHeader(hash);
    this.#cache.set(cacheKey, resp);
    return resp;
  }

  async #getHeader(at: BlockHash): Promise<Option<HexString>> {
    return await this.send('header', this.#subscriptionId, at);
  }

  /**
   * chainHead_storage
   */
  async storage(items: Array<StorageQuery>, childTrie?: string | null, at?: BlockHash): Promise<Array<StorageResult>> {
    await this.#ensureFollowed();
    const shouldRetryOnPrunedBlock = !at;

    const hash = this.#ensurePinnedHash(at);
    try {
      // JSON.stringify(items) might get big, we probably should do a twox hashing in such case
      const cacheKey = `${hash}::storage::${JSON.stringify(items)}::${childTrie ?? null}`;
      if (this.#cache.has(cacheKey)) {
        return this.#cache.get(cacheKey);
      }

      this.#blockUsage.use(hash);

      const fetchItem = async (item: StorageQuery): Promise<StorageResult> => {
        const [newBatch, newDiscardedItems] = await this.#getStorage([item], childTrie ?? null, hash);
        if (newDiscardedItems.length > 0) {
          return fetchItem(newDiscardedItems[0]);
        }

        if (newBatch.length === 0) {
          return { key: item.key, value: undefined };
        }

        return newBatch[0];
      };

      const results: Array<StorageResult> = await Promise.all(items.map((one) => fetchItem(one)));

      this.#cache.set(cacheKey, results);
      return results;
    } catch (e) {
      if (e instanceof ChainHeadBlockPrunedError && shouldRetryOnPrunedBlock) {
        return await this.storage(items, childTrie);
      }

      throw e;
    } finally {
      this.#blockUsage.release(hash);
    }
  }

  async #getStorage(
    items: Array<StorageQuery>,
    childTrie: string | null,
    at: BlockHash,
  ): Promise<[fetchedResults: Array<StorageResult>, discardedItems: Array<StorageQuery>]> {
    const operation = () => this.#getStorageOperation(items, childTrie, this.#ensurePinnedHash(at));

    return this.#performOperationWithRetry(operation, at);
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
   * @protected
   */
  protected async stopOperation(operationId: OperationId): Promise<void> {
    await this.#ensureFollowed();

    await this.send('stopOperation', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_continue
   * @protected
   */
  protected async continue(operationId: OperationId): Promise<void> {
    await this.#ensureFollowed();

    await this.send('continue', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unpin
   * @protected
   */
  protected async unpin(hashes: BlockHash | BlockHash[]): Promise<void> {
    await this.#ensureFollowed();

    if (Array.isArray(hashes) && hashes.length === 0) return;

    await this.send('unpin', this.#subscriptionId, hashes);
  }
}
