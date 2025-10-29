import { $H256, $Header, $RuntimeVersion, BlockHash, Hash, PortableRegistry } from '@dedot/codecs';
import type { JsonRpcProvider } from '@dedot/providers';
import { u32 } from '@dedot/shape';
import { GenericStorageQuery, RpcV2, GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, DedotError, HexString, noop, twox64Concat, u8aToHex, xxhashAsU8a } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RuntimeApiExecutorV2,
  StorageQueryExecutorV2,
  TxExecutorV2,
  ViewFunctionExecutorV2,
} from '../executor/index.js';
import { Archive, ChainHead, ChainSpec, PinnedBlock, Transaction, TransactionWatch } from '../json-rpc/index.js';
import { newProxyChain } from '../proxychain.js';
import { BaseStorageQuery, NewStorageQuery } from '../storage/index.js';
import type {
  ApiOptions,
  DedotClientEvent,
  ISubstrateClientAt,
  SubstrateRuntimeVersion,
  TxBroadcaster,
} from '../types.js';
import { BaseSubstrateClient, ensurePresence } from './BaseSubstrateClient.js';

/**
 * @name DedotClient
 * @description New promised-based API Client for Polkadot & Substrate based on JSON-RPC V2
 *
 * __Unstable, use with caution.__
 */
export class DedotClient<ChainApi extends GenericSubstrateApi = SubstrateApi> // prettier-end-here
  extends BaseSubstrateClient<ChainApi, DedotClientEvent>
{
  protected _chainHead?: ChainHead;
  protected _chainSpec?: ChainSpec;
  protected _archive?: Archive;
  protected _txBroadcaster?: TxBroadcaster;

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
  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<DedotClient<ChainApi>> {
    return new DedotClient<ChainApi>(options).connect();
  }

  /**
   * Alias for __DedotClient.create__
   *
   * @param options
   */
  static async new<ChainApi extends GenericSubstrateApi = SubstrateApi>(
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

  async archive() {
    assert(this._archive, 'Archive instance is not initialized');
    assert(await this._archive.supported(), 'Archive JSON-RPC is not supported by the connected server');

    return this._archive;
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

    // Always initialize Archive, but only set up fallback if supported
    this._archive = new Archive(this, { rpcMethods });

    // Set up ChainHead with Archive fallback only if Archive is supported
    if (await this._archive.supported()) {
      this._chainHead.withArchive(this._archive);
    }

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

    // relegate events
    this.chainHead.on('newBlock', (...args) => this.emit('newBlock', ...args));
    this.chainHead.on('bestBlock', (...args) => this.emit('bestBlock', ...args));
    this.chainHead.on('finalizedBlock', (...args) => this.emit('finalizedBlock', ...args));
    this.chainHead.on('bestChainChanged', (...args) => this.emit('bestChainChanged', ...args));
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
    try {
      this.chainHead.unfollow().catch(noop);
    } catch {}
  };

  protected override cleanUp() {
    super.cleanUp();
    this._chainHead = undefined;
    this._chainSpec = undefined;
    this._archive = undefined;
    this._txBroadcaster = undefined;
  }

  /**
   * @description Clear local cache, API at-block cache, and ChainHead cache
   * @param keepMetadataCache Keep the metadata cache, only clear other caches.
   */
  async clearCache(keepMetadataCache: boolean = false) {
    await super.clearCache(keepMetadataCache);
    this._chainHead?.clearCache();
  }

  override get query(): ChainApi['query'] {
    return newProxyChain({
      executor: new StorageQueryExecutorV2(this, this.chainHead),
    }) as ChainApi['query'];
  }

  override get view(): ChainApi['view'] {
    return newProxyChain({
      executor: new ViewFunctionExecutorV2(this, this.chainHead),
    }) as ChainApi['view'];
  }

  override get call(): ChainApi['call'] {
    return this.callAt();
  }

  protected override callAt(blockHash?: BlockHash): ChainApi['call'] {
    return newProxyChain({
      executor: new RuntimeApiExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi['call'];
  }

  override get tx(): ChainApi['tx'] {
    return newProxyChain({ executor: new TxExecutorV2(this) }) as ChainApi['tx'];
  }

  /**
   * Get a new API instance at a specific block hash
   * Supports both pinned blocks (via ChainHead) and historical blocks (via Archive fallback)
   *
   * @param hash
   */
  async at<ChainApiAt extends GenericSubstrateApi = ChainApi>(
    hash: BlockHash,
  ): Promise<ISubstrateClientAt<ChainApiAt>> {
    const cached = this._apiAtCache.get<ISubstrateClientAt<ChainApiAt>>(hash);
    if (cached) return cached;

    let parentVersion: SubstrateRuntimeVersion;
    let parentHash: Hash;

    // Try to get block info from ChainHead first (for pinned blocks)
    const targetBlock = this.chainHead.findBlock(hash);
    if (targetBlock) {
      if (hash === this.genesisHash) {
        parentHash = hash;
        parentVersion = targetBlock.runtime!;
      } else {
        parentHash = targetBlock.parent;
        const parentBlock = this.chainHead.findBlock(parentHash);
        parentVersion = parentBlock?.runtime as SubstrateRuntimeVersion;
      }

      // fallback to fetching on-chain runtime if we can't find it in the block
      if (!parentVersion) {
        parentVersion = this.toSubstrateRuntimeVersion(await this.callAt(parentHash).core.version());
      }
    } else {
      // Block not pinned, try via Archive fallback if supported
      if (this._archive && (await this._archive.supported())) {
        try {
          if (hash === this.genesisHash) {
            parentHash = hash;
          } else {
            const rawHeader = await this._archive.header(hash);
            assert(rawHeader, `Header for block ${hash} not found`);
            const header = $Header.tryDecode(rawHeader);
            parentHash = header.parentHash;
          }

          // Fetch runtime version via Archive
          const runtimeRaw = await this._archive.call('Core_version', '0x', parentHash);
          assert(runtimeRaw, 'Runtime Version Not Found');
          parentVersion = this.toSubstrateRuntimeVersion($RuntimeVersion.tryDecode(runtimeRaw));
        } catch (error) {
          throw new DedotError(`Unable to fetch runtime version for block ${hash}: ${error}`);
        }
      } else {
        throw new DedotError('Block is not pinned and Archive JSON-RPC is not supported by the server/node!');
      }
    }

    let metadata = this.metadata;
    let registry: any = this.registry;
    if (parentVersion && parentVersion.specVersion !== this.runtimeVersion.specVersion) {
      const cachedMetadata = this.findMetadataInCache(parentVersion.specVersion);
      if (cachedMetadata) {
        metadata = cachedMetadata[0];
        registry = cachedMetadata[1];
      } else {
        metadata = await this.fetchMetadata(parentHash, parentVersion);
        registry = new PortableRegistry<ChainApiAt['types']>(metadata.latest, this.options.hasher);
      }
    }

    const api = {
      rpcVersion: 'v2',
      atBlockHash: hash,
      options: this.options,
      genesisHash: this.genesisHash,
      runtimeVersion: parentVersion,
      metadata,
      registry,
      rpc: this.rpc,
    } as ISubstrateClientAt<ChainApiAt>;

    api.consts = newProxyChain({ executor: new ConstantExecutor(api) }) as ChainApiAt['consts'];
    api.events = newProxyChain({ executor: new EventExecutor(api) }) as ChainApiAt['events'];
    api.errors = newProxyChain({ executor: new ErrorExecutor(api) }) as ChainApiAt['errors'];
    api.query = newProxyChain({
      executor: new StorageQueryExecutorV2(api, this.chainHead),
    }) as ChainApiAt['query'];
    api.call = newProxyChain({ executor: new RuntimeApiExecutorV2(api, this.chainHead) }) as ChainApiAt['call'];
    api.view = newProxyChain({
      executor: new ViewFunctionExecutorV2(api, this.chainHead),
    }) as ChainApiAt['view'];

    // @ts-ignore Add queryMulti implementation for at-block queries
    api.queryMulti = (queries: { fn: GenericStorageQuery; args?: any[] }[]) => {
      return this.internalQueryMulti(queries, undefined, hash);
    };

    this._apiAtCache.set(hash, api);

    return api;
  }

  protected override getStorageQuery(): BaseStorageQuery {
    return new NewStorageQuery(this);
  }
}
