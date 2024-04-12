import type { SubstrateApi } from '../chaintypes/index.js';
import { $Metadata, BlockHash, Hash, Metadata, PortableRegistry } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RuntimeApiExecutorV2,
  StorageQueryExecutorV2,
  TxExecutor,
} from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import type {
  ApiEvent,
  ApiOptions,
  ISubstrateClient,
  HashOrSource,
  NetworkEndpoint,
  NormalizedApiOptions,
  SubstrateChainProperties,
  SubstrateRuntimeVersion,
} from '../types.js';
import { type IStorage, LocalStorage } from '@dedot/storage';
import { HexString, u8aToHex } from '@dedot/utils';
import { ChainHead, ChainSpec, JsonRpcClient } from '../json-rpc/index.js';
import { CATCH_ALL_METADATA_KEY, ensurePresence, SUPPORTED_METADATA_VERSIONS } from './Dedot.js';
import { ChainHeadRuntimeVersion } from '@dedot/specs';

/**
 * @name DedotClient
 * @description New promised-based API Client for Polkadot & Substrate based on JSON-RPC V2
 * ```
 */
export class DedotClient<ChainApi extends GenericSubstrateApi = SubstrateApi>
  extends JsonRpcClient<ChainApi, ApiEvent>
  implements ISubstrateClient<ChainApi, ApiEvent>
{
  readonly #options: NormalizedApiOptions;

  #registry?: PortableRegistry;
  #metadata?: Metadata;

  #genesisHash?: Hash;
  #runtimeVersion?: SubstrateRuntimeVersion;
  #chainProperties?: SubstrateChainProperties;
  #runtimeChain?: string;
  #localCache?: IStorage;

  #chainHead?: ChainHead;
  #chainSpec?: ChainSpec;

  /**
   * Use factory methods (`create`, `new`) to create `DedotClient` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | NetworkEndpoint) {
    super(options);
    this.#options = this.#normalizeOptions(options);
  }

  /**
   * Factory method to create a new DedotClient instance
   *
   * @param options
   */
  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<DedotClient<ChainApi>> {
    return new DedotClient<ChainApi>(options).connect();
  }

  /**
   * Alias for __DedotClient.create__
   *
   * @param options
   */
  static async new<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<DedotClient<ChainApi>> {
    return DedotClient.create(options);
  }

  async #doConnect(): Promise<this> {
    this.on('connected', this.#onConnected);
    this.on('disconnected', this.#onDisconnected);

    return new Promise<this>((resolve) => {
      this.once('ready', () => {
        resolve(this);
      });
    });
  }

  #onConnected = async () => {
    await this.#initialize();
  };

  #onDisconnected = async () => {
    await this.#unsubscribeUpdates();
  };

  get chainSpec() {
    return ensurePresence(this.#chainSpec);
  }

  get chainHead() {
    return ensurePresence(this.#chainHead);
  }

  /**
   * Initialize APIs before usage
   */
  async #initialize() {
    await this.#initializeLocalCache();

    const rpcMethods = (await this.rpc.rpc_methods()).methods;

    this.#chainSpec = new ChainSpec(this, { rpcMethods });
    this.#chainHead = new ChainHead(this, { rpcMethods });

    // Fetching node information
    let [_, genesisHash, chainName, chainProps] = await Promise.all([
      this.chainHead.follow(true),
      this.chainSpec.genesisHash(),
      this.chainSpec.chainName(),
      this.chainSpec.properties(),
    ]);

    this.#genesisHash = genesisHash as HexString;
    this.#runtimeChain = chainName;
    this.#runtimeVersion = this.chainHead.runtimeVersion;
    this.#chainProperties = chainProps;

    let metadata: Metadata | undefined;
    if (await this.#shouldLoadPreloadMetadata()) {
      metadata = await this.#fetchMetadata();
    }

    await this.#setupMetadata(metadata);
    this.#subscribeUpdates();

    this.emit('ready');
  }

  async #initializeLocalCache() {
    if (!this.#options.cacheMetadata) return;

    // Initialize local cache
    if (this.#options.cacheStorage) {
      this.#localCache = this.#options.cacheStorage;
      return;
    }

    try {
      this.#localCache = new LocalStorage();
    } catch {
      throw new Error('localStorage is not available for caching, please provide a cacheStorage option');
    }
  }

  async #setupMetadata(preloadMetadata: Metadata | undefined) {
    let metadata: Metadata | undefined = preloadMetadata;

    const metadataKey = this.currentMetadataKey;
    const optMetadataBundles = this.#options.metadata;
    let shouldUpdateCache = !!metadata;

    if (optMetadataBundles && !metadata) {
      const optRawMetadata = optMetadataBundles[CATCH_ALL_METADATA_KEY] || optMetadataBundles[metadataKey];
      if (optRawMetadata) {
        metadata = $Metadata.tryDecode(optRawMetadata);
      }
    }

    try {
      if (this.#localCache && this.#options.cacheMetadata) {
        if (!metadata) {
          try {
            const cachedRawMetadata = await this.#localCache.get(metadataKey);
            if (cachedRawMetadata) {
              metadata = $Metadata.tryDecode(cachedRawMetadata);
            }
          } catch (e) {
            console.error('Cannot decode raw metadata, try fetching fresh metadata from chain.', e);
          }
        }
      }
    } finally {
      if (!metadata) {
        metadata = await this.#fetchMetadata();

        if (this.#options.cacheMetadata) shouldUpdateCache = true;
      }
    }

    if (shouldUpdateCache && this.#localCache) {
      await this.#localCache.set(metadataKey, u8aToHex($Metadata.tryEncode(metadata)));
    }

    if (!metadata) {
      throw new Error('Cannot load metadata');
    }

    this.setMetadata(metadata);
  }

  async #fetchMetadata(): Promise<Metadata> {
    // It makes sense to call metadata.metadataVersions to fetch the list of supported metadata versions first
    // But for now, this approach could potentially help save/reduce one rpc call to the server in case the node support v15
    // Question: Why not having a `metadata.metadataLatest` to fetch the latest version?
    for (const version of SUPPORTED_METADATA_VERSIONS) {
      try {
        const rawMetadata = await this.call.metadata.metadataAtVersion(version);
        if (!rawMetadata) continue;

        return $Metadata.tryDecode(rawMetadata);
      } catch (e) {
        console.log(e);
      }
    }

    try {
      return $Metadata.tryDecode(await this.call.metadata.metadata());
    } catch (e) {
      console.log(e);
      return await this.rpc.state_getMetadata();
    }
  }

  #subscribeRuntimeUpgrades() {
    if (this.hasCatchAllMetadata) return;

    this.chainHead.on('finalizedBlock', async (_: BlockHash, newRuntime?: ChainHeadRuntimeVersion) => {
      if (newRuntime && newRuntime.specVersion !== this.#runtimeVersion?.specVersion) {
        this.#runtimeVersion = newRuntime;
        const newMetadata = await this.#fetchMetadata();
        await this.#setupMetadata(newMetadata);
      }
    });
  }

  #subscribeUpdates() {
    this.#subscribeRuntimeUpgrades();
  }

  async #unsubscribeUpdates() {}

  async #shouldLoadPreloadMetadata() {
    if (this.#options.metadata && Object.keys(this.#options.metadata).length) {
      return false;
    }

    if (!this.#options.cacheMetadata || !this.#localCache) {
      return true;
    }

    // TODO improve this
    const keys = await this.#localCache.keys();
    return !keys.some((k) => k.startsWith('RAW_META/'));
  }

  #normalizeOptions(options: ApiOptions | NetworkEndpoint): NormalizedApiOptions {
    if (typeof options === 'string') {
      return { ...this.#getDefaultOptions(), endpoint: options };
    } else {
      let { metadata } = options || {};
      if (metadata && typeof metadata === 'string') {
        metadata = {
          [CATCH_ALL_METADATA_KEY]: metadata,
        };
      }

      return { ...this.#getDefaultOptions(), ...options, metadata } as NormalizedApiOptions;
    }
  }

  #getDefaultOptions(): Partial<NormalizedApiOptions> {
    return {
      throwOnUnknownApi: true,
    };
  }

  /**
   * @description Entry-point for inspecting constants (parameter types) for all pallets (modules).
   *
   * ```typescript
   * const ss58Prefix = api.consts.system.ss58Prefix;
   * console.log('ss58Prefix:', ss58Prefix)
   * ```
   */
  get consts(): ChainApi['consts'] {
    return newProxyChain<ChainApi>({ executor: new ConstantExecutor(this) }) as ChainApi['consts'];
  }

  /**
   * @description Entry-point for executing query to on-chain storage.
   *
   * ```typescript
   * const balance = await api.query.system.account(<address>);
   * console.log('Balance:', balance);
   * ```
   */
  get query(): ChainApi['query'] {
    return newProxyChain<ChainApi>({ executor: new StorageQueryExecutorV2(this, this.chainHead) }) as ChainApi['query'];
  }

  queryAt(blockHash: HashOrSource): ChainApi['query'] {
    return newProxyChain<ChainApi>({
      executor: new StorageQueryExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi['query'];
  }

  /**
   * @description Entry-point for inspecting errors from metadata
   */
  get errors(): ChainApi['errors'] {
    return newProxyChain<ChainApi>({ executor: new ErrorExecutor(this) }) as ChainApi['errors'];
  }

  /**
   * @description Entry-point for inspecting events from metadata
   */
  get events(): ChainApi['events'] {
    return newProxyChain<ChainApi>({ executor: new EventExecutor(this) }) as ChainApi['events'];
  }

  /**
   * @description Entry-point for executing runtime api
   *
   * ```typescript
   * // Get account nonce
   * const nonce = await api.call.accountNonceApi.accountNonce(<address>);
   *
   * // Query transaction payment info
   * const tx = api.tx.balances.transferKeepAlive(<address>, 2_000_000_000_000n);
   * const queryInfo = await api.call.transactionPaymentApi.queryInfo(tx.toU8a(), tx.length);
   * ```
   */
  get call(): ChainApi['call'] {
    return newProxyChain<ChainApi>({ executor: new RuntimeApiExecutorV2(this, this.chainHead) }) as ChainApi['call'];
  }

  callAt(blockHash: BlockHash): ChainApi['call'] {
    return newProxyChain<ChainApi>({
      executor: new RuntimeApiExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi['call'];
  }

  /**
   * @description Entry-point for executing on-chain transactions
   *
   * ```typescript
   * // Make a transfer balance transaction
   * api.tx.balances.transferKeepAlive(<address>, <amount>)
   *    .signAndSend(<keyPair|address>, { signer }, ({ status }) => {
   *      console.log('Transaction status', status.tag);
   *    });
   * ```
   */
  get tx(): ChainApi['tx'] {
    return newProxyChain<ChainApi>({ executor: new TxExecutor(this) }) as ChainApi['tx'];
  }

  /**
   * @description Codec registry
   */
  get registry() {
    return ensurePresence(this.#registry);
  }

  /**
   * @description Check if metadata is present
   */
  get hasMetadata(): boolean {
    return !!this.#metadata;
  }

  get metadata(): Metadata {
    return ensurePresence(this.#metadata);
  }

  /**
   * Setup metadata for
   * @param metadata
   */
  setMetadata(metadata: Metadata) {
    this.#metadata = metadata;
    this.#registry = new PortableRegistry(metadata.latest);
  }

  /**
   * @description Connect to blockchain node
   */
  async connect(): Promise<this> {
    const [api, _] = await Promise.all([this.#doConnect(), super.connect()]);

    return api;
  }

  /**
   * @description Disconnect to blockchain node
   */
  async disconnect() {
    await this.#unsubscribeUpdates();
    await super.disconnect();
    this.#cleanUp();
  }

  #cleanUp() {
    this.#registry = undefined;
    this.#metadata = undefined;

    this.#genesisHash = undefined;
    this.#runtimeVersion = undefined;
    this.#chainProperties = undefined;
    this.#runtimeChain = undefined;
    this.#localCache = undefined;
    this.#chainHead = undefined;
    this.#chainSpec = undefined;
  }

  /**
   * @description Clear local cache
   */
  async clearCache() {
    await this.#localCache?.clear();
  }

  /**
   * @description Check if the api instance is using a catch-all metadata
   */
  get hasCatchAllMetadata(): boolean {
    return !!this.#options.metadata && !!this.#options.metadata[CATCH_ALL_METADATA_KEY];
  }

  get currentMetadataKey(): string {
    return `RAW_META/${this.#genesisHash || '0x'}/${this.#runtimeVersion?.specVersion || '---'}`;
  }

  /**
   * @description Genesis hash of connected blockchain node
   */
  get genesisHash() {
    return ensurePresence(this.#genesisHash);
  }

  /**
   * @description Runtime version of connected blockchain node
   */
  get runtimeVersion(): SubstrateRuntimeVersion {
    return ensurePresence(this.#runtimeVersion);
  }

  /**
   * @description Chain properties of connected blockchain node
   */
  get chainProperties() {
    return ensurePresence(this.#chainProperties);
  }

  /**
   * @description Runtime chain name of connected blockchain node
   */
  get runtimeChain() {
    return ensurePresence(this.#runtimeChain);
  }

  get options() {
    return this.#options;
  }
}
