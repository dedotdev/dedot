import { BlockHash, Option } from '@dedot/codecs';
import { Subscription } from '@dedot/providers';
import {
  ChainHeadRuntimeVersion,
  FollowEvent,
  FollowOperationEvent,
  MethodResponse,
  OperationId,
  RuntimeEvent,
  StorageQuery,
  StorageResult,
} from '@dedot/specs';
import { Unsub } from '@dedot/types';
import { assert, Deferred, deferred, ensurePresence, HexString, noop } from '@dedot/utils';
import { IJsonRpcClient } from '../../../types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from '../JsonRpcGroup.js';
import {
  ChainHeadBlockNotPinnedError,
  ChainHeadError,
  ChainHeadInvalidRuntimeError,
  ChainHeadLimitReachedError,
  ChainHeadOperationError,
  ChainHeadOperationInaccessibleError,
  ChainHeadStopError,
} from './error.js';

export type OperationHandler<T = any> = {
  operationId: OperationId;
  defer: Deferred<T>;
  storageResults?: Array<StorageResult>;
};

export type PinnedBlock = {
  hash: BlockHash;
  parent: BlockHash | undefined;
  runtime?: ChainHeadRuntimeVersion;
};

export type ChainHeadEvent =
  | 'newBlock'
  | 'bestBlock' // new best block
  | 'finalizedBlock'; // new best finalized block
// TODO handle: | 'bestChainChanged'; // new best chain, a fork happened

export const MIN_QUEUE_SIZE = 10;

export class ChainHead extends JsonRpcGroup<ChainHeadEvent> {
  #unsub?: Unsub;
  #subscriptionId?: string;

  #handlers: Record<OperationId, OperationHandler>;
  #pendingOperations: Record<OperationId, FollowOperationEvent[]>;

  // For now we'll maintain the pinned block queue size equal to
  // number of finalizedBlockHashes we receive in the `initialized` event
  // Future: we can allow to adjust this queue size
  #queueSize: number; // pinned blocks queue size
  #pinnedQueue: Array<BlockHash>; // pinned blocks queue
  #pinnedBlocks: Record<BlockHash, PinnedBlock>;

  #bestHash?: BlockHash;
  #finalizedHash?: BlockHash; // best finalized hash
  #finalizedRuntime?: ChainHeadRuntimeVersion;

  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainHead', supportedVersions: ['unstable', 'v1'], ...options });
    this.#handlers = {};
    this.#pendingOperations = {};
    this.#pinnedBlocks = {};
    this.#queueSize = MIN_QUEUE_SIZE;
    this.#pinnedQueue = [];
  }

  get runtimeVersion(): ChainHeadRuntimeVersion {
    this.#ensureFollowed();

    return this.#finalizedRuntime!;
  }

  get bestRuntimeVersion(): ChainHeadRuntimeVersion {
    this.#ensureFollowed();

    return this.#findRuntimeAt(this.#bestHash!) || this.runtimeVersion;
  }

  get finalizedHash(): BlockHash {
    this.#ensureFollowed();

    return this.#finalizedHash!;
  }

  get bestHash(): BlockHash {
    this.#ensureFollowed();

    return this.#bestHash!;
  }

  /**
   * chainHead_follow
   */
  async follow(): Promise<void> {
    assert(!this.#subscriptionId, 'Already followed chain head. Please unfollow first.');

    const defer = deferred<void>();

    try {
      this.#unsub = await this.send('follow', true, (event: FollowEvent, subscription: Subscription) => {
        this.#onFollowEvent(event, subscription);

        if (event.event == 'initialized') {
          defer.resolve();
        }
      });
    } catch (e: any) {
      defer.reject(e);
    }

    return defer.promise;
  }

  #onFollowEvent = (result: FollowEvent, subscription?: Subscription) => {
    switch (result.event) {
      case 'initialized': {
        const { finalizedBlockHashes = [], finalizedBlockHash, finalizedBlockRuntime } = result;
        if (finalizedBlockHash) finalizedBlockHashes.push(finalizedBlockHash);

        this.#subscriptionId = subscription!.subscriptionId;
        this.#pinnedQueue = finalizedBlockHashes;
        if (finalizedBlockHashes.length > MIN_QUEUE_SIZE) {
          this.#queueSize = finalizedBlockHashes.length;
        }

        this.#pinnedBlocks = finalizedBlockHashes.reverse().reduce(
          (o, hash, idx, arr) => {
            o[hash] = { hash, parent: arr.at(idx + 1) };
            return o;
          },
          {} as Record<BlockHash, PinnedBlock>,
        );
        this.#finalizedRuntime = this.#extractRuntime(finalizedBlockRuntime)!;
        this.#bestHash = this.#finalizedHash = finalizedBlockHashes.at(-1);

        break;
      }
      case 'newBlock': {
        const { blockHash: hash, parentBlockHash: parent, newRuntime } = result;
        const runtime = this.#extractRuntime(newRuntime);

        this.#pinnedBlocks[hash] = { hash, parent, runtime };
        this.#pinnedQueue.push(hash);

        this.emit('newBlock', hash, runtime);
        break;
      }
      case 'bestBlockChanged': {
        // TODO detect bestChainChanged, the new bestBlockHash could lead to a fork
        this.#bestHash = result.bestBlockHash;
        this.emit('bestBlock', this.#bestHash, this.#findRuntimeAt(this.#bestHash));
        break;
      }
      case 'finalized': {
        const { finalizedBlockHashes, prunedBlockHashes } = result;
        this.#finalizedHash = finalizedBlockHashes.at(-1)!;
        const finalizedRuntime = this.#findRuntimeAt(this.#finalizedHash)!;
        if (finalizedRuntime) {
          this.#finalizedRuntime = finalizedRuntime;
        }

        this.emit('finalizedBlock', this.#finalizedHash, finalizedRuntime);

        const hashesToUnpin = [...prunedBlockHashes];
        if (this.#pinnedQueue.length > this.#queueSize) {
          const numOfItemsToUnpin = this.#pinnedQueue.length - this.#queueSize;
          const queuedHashesToUnpin = this.#pinnedQueue.splice(0, numOfItemsToUnpin);
          queuedHashesToUnpin.map((hash) => delete this.#pinnedBlocks[hash]);
          hashesToUnpin.push(...queuedHashesToUnpin);
        }

        this.unpin(hashesToUnpin).catch(noop);
        break;
      }
      case 'stop': {
        // TODO handle smart retry & operation recovery
        // For now we'll reject all on-going operations
        Object.values(this.#handlers).forEach(({ defer }) => {
          defer.reject(new ChainHeadStopError('Subscription stopped!'));
        });

        this.#handlers = {};
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
    this.#ensureFollowed();

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
  }

  #ensureFollowed() {
    assert(this.#subscriptionId, 'Please call the .follow() method before invoking any other methods in this group.');
  }

  #cleanUpOperation(operationId: OperationId) {
    delete this.#handlers[operationId];
    this.stopOperation(operationId).catch(noop);
  }

  async #awaitOperationWithRetry<T = any>(resp: MethodResponse, retry: () => Promise<T>): Promise<T> {
    try {
      return await this.#awaitOperation(resp);
    } catch (e) {
      if (resp.result === 'started') {
        this.#cleanUpOperation(resp.operationId);
      }

      // TODO limit number of retry time
      if (e instanceof ChainHeadError && e.shouldRetry) {
        return retry();
      }

      throw e;
    }
  }

  #awaitOperation<T = any>(resp: MethodResponse): Promise<T> {
    if (resp.result === 'limitReached') {
      throw new ChainHeadLimitReachedError('Limit reached');
    }

    const defer = deferred<T>();

    this.#handlers[resp.operationId] = {
      operationId: resp.operationId,
      defer,
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
    this.#ensureFollowed();

    const resp: MethodResponse = await this.send('body', this.#subscriptionId, this.#ensurePinnedHash(at));

    return this.#awaitOperationWithRetry(resp, () => this.body(at));
  }

  /**
   * chainHead_call
   */
  async call(func: string, params: HexString = '0x', at?: BlockHash): Promise<HexString> {
    this.#ensureFollowed();

    const resp: MethodResponse = await this.send(
      'call',
      this.#subscriptionId,
      this.#ensurePinnedHash(at),
      func,
      params,
    );

    return this.#awaitOperationWithRetry(resp, () => this.call(func, params, at));
  }

  /**
   * chainHead_header
   */
  async header(at?: BlockHash): Promise<Option<HexString>> {
    this.#ensureFollowed();

    return await this.send('header', this.#subscriptionId, this.#ensurePinnedHash(at));
  }

  /**
   * chainHead_storage
   */
  async storage(items: Array<StorageQuery>, childTrie?: string | null, at?: BlockHash): Promise<Array<StorageResult>> {
    this.#ensureFollowed();

    const results: Array<StorageResult> = [];

    let queryItems = items;
    while (queryItems.length > 0) {
      const [newBatch, newDiscardedItems] = await this.#getStorage(queryItems, childTrie, at);
      results.push(...newBatch);
      queryItems = newDiscardedItems;
    }

    return results;
  }

  async #getStorage(
    items: Array<StorageQuery>,
    childTrie?: string | null,
    at?: BlockHash,
  ): Promise<[fetchedResults: Array<StorageResult>, discardedItems: Array<StorageQuery>]> {
    this.#ensureFollowed();

    const resp: MethodResponse = await this.send(
      'storage',
      this.#subscriptionId,
      this.#ensurePinnedHash(at),
      items,
      childTrie,
    );

    let discardedItems: Array<StorageQuery> = [];
    if (resp.result === 'started' && resp.discardedItems && resp.discardedItems > 0) {
      discardedItems = items.slice(items.length - resp.discardedItems);
    }

    try {
      return [await this.#awaitOperation(resp), discardedItems];
    } catch (e) {
      if (resp.result === 'started') {
        this.#cleanUpOperation(resp.operationId);
      }

      if (e instanceof ChainHeadError && e.shouldRetry) {
        return this.#getStorage(items, childTrie, at);
      }

      throw e;
    }
  }

  /**
   * chainHead_stopOperation
   */
  async stopOperation(operationId: OperationId): Promise<void> {
    this.#ensureFollowed();

    await this.send('stopOperation', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_continue
   */
  async continue(operationId: OperationId): Promise<void> {
    this.#ensureFollowed();

    await this.send('continue', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unpin
   */
  async unpin(hashes: BlockHash | BlockHash[]): Promise<void> {
    this.#ensureFollowed();

    await this.send('unpin', this.#subscriptionId, hashes);
  }
}
