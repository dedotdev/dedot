import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { Unsub } from '@dedot/types';
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
import { Subscription } from '@dedot/providers';
import { BlockHash, Option } from '@dedot/codecs';
import { assert, ensurePresence, HexString, noop } from '@dedot/utils';
import { IJsonRpcClient } from '../../types.js';

export type OperationHandler = {
  operationId: OperationId;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  storageResults?: Array<StorageResult>;
};

export type PinnedBlock = {
  hash: BlockHash;
  runtime?: ChainHeadRuntimeVersion;
};

export type ChainHeadEvent = 'newBlock' | 'bestBlock' | 'finalizedBlock';

export class ChainHead extends JsonRpcGroup<ChainHeadEvent> {
  #unsub?: Unsub;
  #subscriptionId?: string;

  #handlers: Record<OperationId, OperationHandler>;
  #pendingOperations: Record<OperationId, FollowOperationEvent[]>;

  #pinnedBlocks: Array<PinnedBlock>;
  #bestHash?: BlockHash;
  #finalizedHash?: BlockHash;
  #finalizedRuntime?: ChainHeadRuntimeVersion;

  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainHead', supportedVersions: ['unstable', 'v1'], ...options });
    this.#handlers = {};
    this.#pendingOperations = {};
    this.#pinnedBlocks = [];
  }

  get runtimeVersion(): ChainHeadRuntimeVersion {
    this.#ensureFollowed();

    return this.#finalizedRuntime!;
  }

  get bestRuntimeVersion(): ChainHeadRuntimeVersion {
    this.#ensureFollowed();

    return this.#findRuntimeAt(this.#bestHash!)!;
  }

  /**
   * chainHead_unstable_follow
   */
  async follow(withRuntime: boolean = true): Promise<void> {
    assert(!this.#subscriptionId, 'Already followed chain head. Please unfollow first.');

    return new Promise<void>(async (resolve) => {
      this.#unsub = await this.send('follow', withRuntime, (event: FollowEvent, subscription: Subscription) => {
        this.#onFollowEvent(event, subscription);

        if (event.event == 'initialized') {
          resolve();
        }
      });
    });
  }

  #onFollowEvent = (result: FollowEvent, subscription?: Subscription) => {
    switch (result.event) {
      case 'initialized': {
        this.#subscriptionId = subscription!.subscriptionId;
        this.#pinnedBlocks = result.finalizedBlockHashes.map((hash) => ({ hash }));
        this.#finalizedRuntime = this.#extractRuntime(result.finalizedBlockRuntime)!;
        this.#bestHash = this.#finalizedHash = this.#pinnedBlocks.at(-1)!.hash;

        break;
      }
      case 'newBlock': {
        const hash = result.blockHash;
        const runtime = this.#extractRuntime(result.newRuntime);

        this.#pinnedBlocks.push({ hash, runtime });

        this.emit('newBlock', hash, runtime);
        break;
      }
      case 'bestBlockChanged': {
        this.#bestHash = result.bestBlockHash;
        this.emit('bestBlock', this.#bestHash, this.#findRuntimeAt(this.#bestHash));
        break;
      }
      case 'finalized': {
        this.#finalizedHash = result.finalizedBlockHashes.at(-1)!;
        const finalizedRuntime = this.#findRuntimeAt(this.#finalizedHash)!;
        if (finalizedRuntime) {
          this.#finalizedRuntime = finalizedRuntime;
        }

        this.emit('finalizedBlock', this.#finalizedHash, this.#finalizedRuntime);

        // TODO check again this logic
        // TODO logic to unpin more blocks in the queue
        const cutOffBlocks = this.#pinnedBlocks.splice(this.#pinnedBlocks.length - result.finalizedBlockHashes.length);
        const toUnpinHashes: HexString[] = [...result.prunedBlockHashes, ...cutOffBlocks.map(({ hash }) => hash)];

        this.unpin(toUnpinHashes).catch(noop);
        console.log('PinnedSize', this.#pinnedBlocks.length, 'Best Hash', this.#ensurePinnedHash());
        break;
      }
      case 'stop':
        // TODO handle retry & recovery
        throw new Error('Subscription stopped!');
      case 'operationBodyDone': {
        this.#handleOperationResponse(result, ({ resolve }) => {
          resolve(result.value);
        });
        break;
      }
      case 'operationCallDone': {
        this.#handleOperationResponse(result, ({ resolve }) => {
          resolve(result.output);
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
        this.#handleOperationResponse(
          result,
          ({ resolve, storageResults }) => {
            resolve(storageResults || []);
          },
          false,
        );
        break;
      }
      case 'operationError': {
        this.#handleOperationResponse(result, ({ reject }) => {
          reject(new Error(result.error));
        });
        break;
      }
      case 'operationInaccessible': {
        this.#handleOperationResponse(result, ({ reject }) => {
          // TODO retry this operation
          reject(new Error('Operation Inaccessible'));
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
    return this.#pinnedBlocks.find((block) => block.hash == at)?.runtime;
  }

  #isPinnedHash(hash: BlockHash): boolean {
    return this.#pinnedBlocks.some((block) => block.hash == hash);
  }

  #ensurePinnedHash(hash?: BlockHash): BlockHash {
    if (hash) {
      if (this.#isPinnedHash(hash)) {
        return hash;
      } else {
        throw new Error('Block hash is not pinned');
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
      delete this.#handlers[result.operationId];
      this.stopOperation(result.operationId).catch(noop);
    }
  }

  #extractRuntime(runtimeEvent: RuntimeEvent | null) {
    if (!runtimeEvent) return;

    if (runtimeEvent.type == 'valid') {
      return runtimeEvent.spec;
    } else {
      // TODO: handle invalid runtime
      console.error(runtimeEvent);
      throw new Error(`Invalid runtime: ${runtimeEvent.error}`);
    }
  }

  /**
   * chainHead_unstable_unfollow
   */
  async unfollow(): Promise<void> {
    this.#ensureFollowed();

    this.#unsub && (await this.#unsub());
    this.#cleanUp();
  }

  #cleanUp() {
    this.#subscriptionId = undefined;
    this.#unsub = undefined;
    this.#handlers = {};
    this.#pendingOperations = {};

    this.#pinnedBlocks = [];
    this.#bestHash = undefined;
    this.#finalizedHash = undefined;
    this.#finalizedRuntime = undefined;
  }

  #ensureFollowed() {
    assert(this.#subscriptionId, 'Please call the .follow() method before invoking any other methods in this group.');
  }

  #awaitOperation<T = any>(resp: MethodResponse): Promise<any> {
    if (resp.result === 'limitReached') {
      throw new Error('Limit reached');
    }

    return new Promise<T>((resolve, reject) => {
      this.#handlers[resp.operationId] = {
        operationId: resp.operationId,
        resolve,
        reject,
      };

      // Resolve pending operations
      if (this.#pendingOperations[resp.operationId]) {
        this.#pendingOperations[resp.operationId].forEach((one) => {
          this.#onFollowEvent(one);
        });

        delete this.#pendingOperations[resp.operationId];
      }
    });
  }

  /**
   * chainHead_unstable_body
   */
  async body(at?: BlockHash): Promise<Array<HexString>> {
    this.#ensureFollowed();

    const resp: MethodResponse = await this.send('body', this.#subscriptionId, this.#ensurePinnedHash(at));

    return this.#awaitOperation(resp);
  }

  /**
   * chainHead_unstable_call
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

    return this.#awaitOperation(resp);
  }

  /**
   * chainHead_unstable_header
   */
  async header(at?: BlockHash): Promise<Option<HexString>> {
    this.#ensureFollowed();

    return await this.send('header', this.#subscriptionId, this.#ensurePinnedHash(at));
  }

  /**
   * chainHead_unstable_storage
   *
   * TODO handle discardedItems
   */
  async storage(items: Array<StorageQuery>, childTrie?: string | null, at?: BlockHash): Promise<Array<StorageResult>> {
    this.#ensureFollowed();

    const resp: MethodResponse = await this.send(
      'storage',
      this.#subscriptionId,
      this.#ensurePinnedHash(at),
      items,
      childTrie,
    );

    return this.#awaitOperation(resp);
  }

  /**
   * chainHead_unstable_stopOperation
   */
  async stopOperation(operationId: OperationId): Promise<void> {
    this.#ensureFollowed();

    await this.send('stopOperation', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unstable_continue
   */
  async continue(operationId: OperationId): Promise<void> {
    this.#ensureFollowed();

    await this.send('continue', this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unstable_unpin
   */
  async unpin(hashes: BlockHash | BlockHash[]): Promise<void> {
    this.#ensureFollowed();

    await this.send('unpin', this.#subscriptionId, hashes);
  }
}
