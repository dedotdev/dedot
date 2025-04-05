import { $H256, BlockHash, PortableRegistry } from '@dedot/codecs';
import type { JsonRpcProvider } from '@dedot/providers';
import { u32 } from '@dedot/shape';
import { Callback, GenericStorageQuery, GenericSubstrateApi, RpcV2, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, HexString, noop, twox64Concat, u8aToHex, xxhashAsU8a } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RuntimeApiExecutorV2,
  StorageQueryExecutorV2,
  TxExecutorV2,
} from '../executor/index.js';
import { ChainHead, ChainSpec, PinnedBlock, Transaction, TransactionWatch } from '../json-rpc/index.js';
import { QueryableStorage } from '../storage/QueryableStorage.js';
import { newProxyChain } from '../proxychain.js';
import { NewStorageQueryService } from '../storage/NewStorageQueryService.js';
import type { ApiOptions, ISubstrateClientAt, SubstrateRuntimeVersion, TxBroadcaster } from '../types.js';
import { BaseSubstrateClient, ensurePresence } from './BaseSubstrateClient.js';

/**
 * @name DedotClient
 * @description New promised-based API Client for Polkadot & Substrate based on JSON-RPC V2
 *
 * __Unstable, use with caution.__
 */
export class DedotClient<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi> // prettier-end-here
  extends BaseSubstrateClient<RpcV2, ChainApi>
{
  protected _chainHead?: ChainHead;
  protected _chainSpec?: ChainSpec;
  protected _txBroadcaster?: TxBroadcaster;
  #apiAtCache: Record<BlockHash, ISubstrateClientAt<any>> = {};

  /**
   * Use factory methods (`create`, `new`) to create `DedotClient` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | JsonRpcProvider) {
    super('v2', options);
  }

  /**
   * Factory method to create a new DedotClient instance
   *
   * @param options
   */
  static async create<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<DedotClient<ChainApi>> {
    return new DedotClient<ChainApi>(options).connect();
  }

  /**
   * Alias for __DedotClient.create__
   *
   * @param options
   */
  static async new<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<DedotClient<ChainApi>> {
    return DedotClient.create(options);
  }

  get chainSpec() {
    return ensurePresence(this._chainSpec);
  }

  get chainHead() {
    return ensurePresence(this._chainHead);
  }

  get txBroadcaster() {
    this.chainHead; // Ensure chain head is initialized
    assert(this._txBroadcaster, 'JSON-RPC method to broadcast transactions is not supported by the server/node.');
    return this._txBroadcaster;
  }

  async #initializeTxBroadcaster(rpcMethods: string[]): Promise<TxBroadcaster | undefined> {
    const tx = new Transaction(this, { rpcMethods });
    if (await tx.supported()) return tx;

    const txWatch = new TransactionWatch(this, { rpcMethods });
    if (await txWatch.supported()) return txWatch;
  }

  /**
   * Initialize APIs before usage
   */
  protected override async doInitialize() {
    const rpcMethods: string[] = (await this.rpc.rpc_methods()).methods;

    this._chainHead = new ChainHead(this, { rpcMethods });
    this._chainSpec = new ChainSpec(this, { rpcMethods });
    this._txBroadcaster = await this.#initializeTxBroadcaster(rpcMethods);

    // Fetching node information
    let [_, genesisHash] = await Promise.all([
      this.chainHead.follow(),
      this.chainSpec.genesisHash().catch(() => undefined),
    ]);

    this._genesisHash = genesisHash || (await this.#getGenesisHashFallback());
    this._runtimeVersion = await this.chainHead.bestRuntimeVersion();

    let metadata;
    if (await this.shouldPreloadMetadata()) {
      metadata = await this.fetchMetadata();
    }

    await this.setupMetadata(metadata);
    this.subscribeRuntimeUpgrades();
  }

  /**
   * Ref: https://github.com/paritytech/polkadot-sdk/blob/bbd51ce867967f71657b901f1a956ad4f75d352e/substrate/frame/system/src/lib.rs#L909-L913
   * @private
   */
  async #getGenesisHashFallback(): Promise<HexString> {
    const pallet = xxhashAsU8a('System', 128);
    const item = xxhashAsU8a('BlockHash', 128);
    const blockHeightAt0 = twox64Concat(u32.encode(0));

    const key = u8aToHex(concatU8a(pallet, item, blockHeightAt0));

    const storageValue = await this.chainHead.storage([{ type: 'value', key }]);

    const rawGenesisHash = storageValue.at(0)?.value;
    assert(rawGenesisHash, 'Genesis hash not found!');

    // Here we assume that in most case the hash is stored as a H256
    return $H256.tryDecode(rawGenesisHash);
  }

  protected subscribeRuntimeUpgrades() {
    this.chainHead.on('bestBlock', this.onRuntimeUpgrade);
  }

  protected onRuntimeUpgrade = async (block: PinnedBlock) => {
    const runtimeUpgraded = block.runtime && block.runtime.specVersion !== this._runtimeVersion?.specVersion;
    if (!runtimeUpgraded) return;

    this.startRuntimeUpgrade();

    this._runtimeVersion = block.runtime;

    const newMetadata = await this.fetchMetadata(undefined, this._runtimeVersion);
    await this.setupMetadata(newMetadata);

    this.emit('runtimeUpgraded', this._runtimeVersion);

    this.doneRuntimeUpgrade();
  };

  protected override async beforeDisconnect(): Promise<void> {
    await this.chainHead.unfollow();
  }

  protected override onDisconnected = async () => {
    this.chainHead.unfollow().catch(noop);
  };

  protected override cleanUp() {
    super.cleanUp();
    this._chainHead = undefined;
    this._chainSpec = undefined;
    this._txBroadcaster = undefined;
    this.#apiAtCache = {};
  }

  override get query(): ChainApi[RpcV2]['query'] {
    return newProxyChain({
      executor: new StorageQueryExecutorV2(this, this.chainHead),
    }) as ChainApi[RpcV2]['query'];
  }

  override get call(): ChainApi[RpcV2]['call'] {
    return this.callAt();
  }

  protected override callAt(blockHash?: BlockHash): ChainApi[RpcV2]['call'] {
    return newProxyChain({
      executor: new RuntimeApiExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi[RpcV2]['call'];
  }

  override get tx(): ChainApi[RpcV2]['tx'] {
    return newProxyChain({ executor: new TxExecutorV2(this) }) as ChainApi[RpcV2]['tx'];
  }

  /**
   * Query multiple storage items in a single call
   * 
   * @param queries Array of query specifications, each with a function and optional arguments
   * @param callback Optional callback for subscription-based queries
   * @returns For one-time queries: Array of decoded values; For subscriptions: Unsubscribe function
   */
  override multiQuery(queries: { fn: GenericStorageQuery, args?: any[] }[], callback?: Callback<any[]>): Promise<any[] | Unsub> {
    // Create service directly when needed
    const service = new NewStorageQueryService(this);
    
    // Extract keys from queries
    const keys = queries.map(q => q.fn.rawKey(...(q.args || [])));
    
    // If a callback is provided, set up a subscription
    if (callback) {
      return service.subscribe(keys, (rawResults) => {
        // Map raw results back to decoded values
        const decodedResults = queries.map((q, i) => {
          // Get the QueryableStorage instance from the query function
          const entry = new QueryableStorage(
            this.registry,
            q.fn.meta.pallet,
            q.fn.meta.name
          );
          
          // Decode the value
          return entry.decodeValue(rawResults[i]);
        });
        
        // Call the callback with decoded values
        callback(decodedResults);
      });
    } 
    // Otherwise, just fetch once
    else {
      return service.query(keys).then(rawResults => {
        // Map raw results back to decoded values
        return queries.map((q, i) => {
          // Get the QueryableStorage instance from the query function
          const entry = new QueryableStorage(
            this.registry,
            q.fn.meta.pallet,
            q.fn.meta.name
          );
          
          // Decode the value
          return entry.decodeValue(rawResults[i]);
        });
      });
    }
  }

  /**
   * Get a new API instance at a specific block hash
   * For now, this only supports pinned block hashes from the chain head
   *
   * @param hash
   */
  async at<ChainApiAt extends GenericSubstrateApi = ChainApi[RpcV2]>(
    hash: BlockHash,
  ): Promise<ISubstrateClientAt<ChainApiAt>> {
    if (this.#apiAtCache[hash]) return this.#apiAtCache[hash];

    const targetBlock = this.chainHead.findBlock(hash);
    assert(targetBlock, 'Block is not pinned!');

    let targetVersion = targetBlock.runtime as SubstrateRuntimeVersion;
    if (!targetVersion) {
      // fallback to fetching on-chain runtime if we can't find it in the block
      targetVersion = this.toSubstrateRuntimeVersion(await this.callAt(hash).core.version());
    }

    let metadata = this.metadata;
    let registry = this.registry;
    if (targetVersion && targetVersion.specVersion !== this.runtimeVersion.specVersion) {
      metadata = await this.fetchMetadata(hash, targetVersion);
      registry = new PortableRegistry(metadata.latest, this.options.hasher);
    }

    const api = {
      rpcVersion: 'v2',
      atBlockHash: hash,
      options: this.options,
      genesisHash: this.genesisHash,
      runtimeVersion: targetVersion,
      metadata,
      registry,
      rpc: this.rpc,
    } as ISubstrateClientAt<ChainApiAt>;

    api.consts = newProxyChain({ executor: new ConstantExecutor(api) }) as ChainApiAt['consts'];
    api.events = newProxyChain({ executor: new EventExecutor(api) }) as ChainApiAt['events'];
    api.errors = newProxyChain({ executor: new ErrorExecutor(api) }) as ChainApiAt['errors'];
    api.query = newProxyChain({ executor: new StorageQueryExecutorV2(api, this.chainHead) }) as ChainApiAt['query'];
    api.call = newProxyChain({ executor: new RuntimeApiExecutorV2(api, this.chainHead) }) as ChainApiAt['call'];

    this.#apiAtCache[hash] = api;

    return api;
  }
}
