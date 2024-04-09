import { RpcGroup } from './RpcGroup.js';
import { GenericSubstrateApi, Unsub } from '@dedot/types';
import { SubstrateApi } from '../chaintypes/index.js';
import { ISubstrateClient } from '../types.js';
import {
  ChainHeadRuntimeVersion,
  FollowEvent,
  FollowOperationEvent,
  MethodResponse,
  RuntimeEvent,
  StorageQuery,
  StorageResult,
} from '@dedot/specs';
import { Subscription } from '@dedot/providers';
import { BlockHash } from '@dedot/codecs';
import { assert, ensurePresence, HexString } from '@dedot/utils';

export type OperationId = string;
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

export class ChainHead<ChainApi extends GenericSubstrateApi = SubstrateApi> extends RpcGroup<ChainApi> {
  #unsub?: Unsub;
  #subscriptionId?: string;

  #handlers: Record<OperationId, OperationHandler>;
  #pendingOperations: Record<OperationId, FollowOperationEvent[]>;

  #pinnedBlocks: Array<PinnedBlock>;
  #finalizedRuntime?: ChainHeadRuntimeVersion;
  #bestHash?: BlockHash;
  #finalizedHash?: BlockHash;

  constructor(api: ISubstrateClient<ChainApi>) {
    super(api);
    this.#handlers = {};
    this.#pendingOperations = {};
    this.#pinnedBlocks = [];
  }

  /**
   * chainHead_unstable_follow
   */
  async follow(withRuntime: boolean = true): Promise<void> {
    assert(!this.#subscriptionId, 'Already followed chain head. Please unfollow first.');

    return new Promise<void>(async (resolve) => {
      this.#unsub = await this.api.rpc.chainHead_unstable_follow(
        withRuntime,
        (event: FollowEvent, subscription: Subscription) => {
          this.#onFollowEvent(event, subscription);

          if (event.event == 'initialized') {
            resolve();
          }
        },
      );
    });
  }

  #onFollowEvent = (result: FollowEvent, subscription?: Subscription) => {
    switch (result.event) {
      case 'initialized':
        this.#subscriptionId = subscription!.subscriptionId;
        this.#pinnedBlocks = result.finalizedBlockHashes.map((hash) => ({ hash }));
        this.#finalizedRuntime = this.#extractRuntime(result.finalizedBlockRuntime)!;
        this.#bestHash = this.#finalizedHash = this.#pinnedBlocks.at(-1)!.hash;

        break;
      case 'newBlock':
        this.#pinnedBlocks.push({ hash: result.blockHash, runtime: this.#extractRuntime(result.newRuntime) });
        break;
      case 'bestBlockChanged':
        this.#bestHash = result.bestBlockHash;
        break;
      case 'finalized':
        this.#finalizedHash = result.finalizedBlockHashes.at(-1)!;
        // TODO check again this logic
        // TODO logic to unpin more blocks in the queue
        const cutOffBlocks = this.#pinnedBlocks.splice(this.#pinnedBlocks.length - result.finalizedBlockHashes.length);
        const toUnpinHashes: HexString[] = [...result.prunedBlockHashes, ...cutOffBlocks.map(({ hash }) => hash)];

        this.unpin(toUnpinHashes).catch(console.error);
        console.log('PinnedSize', this.#pinnedBlocks.length, 'Best Hash', this.#ensurePinnedHash());
        break;
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
        this.continue(result.operationId).catch(console.error);
        break;
      }
    }
  };

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
      this.stopOperation(result.operationId).catch(console.error);
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

    const resp: MethodResponse = await this.api.rpc.chainHead_unstable_body(
      this.#subscriptionId,
      this.#ensurePinnedHash(at),
    );

    return this.#awaitOperation(resp);
  }

  /**
   * chainHead_unstable_call
   */
  async call(func: string, params: HexString = '0x', at?: BlockHash): Promise<HexString> {
    this.#ensureFollowed();

    const resp: MethodResponse = await this.api.rpc.chainHead_unstable_call(
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
  async header(at?: BlockHash): Promise<HexString | null> {
    this.#ensureFollowed();

    return await this.api.rpc.chainHead_unstable_header(this.#subscriptionId, this.#ensurePinnedHash(at));
  }

  /**
   * chainHead_unstable_storage
   *
   * TODO handle discardedItems
   */
  async storage(items: Array<StorageQuery>, childTrie?: string | null, at?: BlockHash): Promise<Array<StorageResult>> {
    this.#ensureFollowed();

    const resp: MethodResponse = await this.api.rpc.chainHead_unstable_storage(
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

    await this.api.rpc.chainHead_unstable_stopOperation(this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unstable_continue
   */
  async continue(operationId: OperationId): Promise<void> {
    this.#ensureFollowed();

    await this.api.rpc.chainHead_unstable_continue(this.#subscriptionId, operationId);
  }

  /**
   * chainHead_unstable_unpin
   */
  async unpin(hashes: BlockHash | BlockHash[]): Promise<void> {
    this.#ensureFollowed();

    await this.api.rpc.chainHead_unstable_unpin(this.#subscriptionId, hashes);
  }
}
