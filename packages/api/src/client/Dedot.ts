import type { SubstrateApi } from '../chaintypes/index.js';
import { $Metadata, BlockHash, Hash, Metadata, MetadataLatest, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { GenericSubstrateApi, Unsub } from '@dedot/types';
import { ChainProperties } from '@dedot/specs';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  JsonRpcExecutor,
  RuntimeApiExecutor,
  StorageQueryExecutor,
  TxExecutor,
} from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import { ApiEventNames, ApiOptions, MetadataKey, NetworkEndpoint, NormalizedApiOptions } from '../types.js';
import { type IStorage, LocalStorage } from '@dedot/storage';
import { assert, EventEmitter, u8aToHex } from '@dedot/utils';
import { ConnectionStatus, type JsonRpcProvider, WsProvider } from '@dedot/providers';

export const KEEP_ALIVE_INTERVAL = 10_000; // in ms
export const CATCH_ALL_METADATA_KEY: MetadataKey = `RAW_META/ALL`;
export const SUPPORTED_METADATA_VERSIONS = [15, 14];

/**
 * @name Dedot
 * @description Promised-based API Client for Polkadot & Substrate
 *
 * ### Initialize API instance and interact with substrate-based network
 * ```typescript
 * import { Dedot } from 'dedot';
 * import type { PolkadotApi } from '@dedot/chaintypes/polkadot';
 *
 * const run = async () => {
 *   const api = await Dedot.new<PolkadotApi>('wss://rpc.polkadot.io');
 *
 *   // Call rpc `state_getMetadata` to fetch raw scale-encoded metadata and decode it.
 *   const metadata = await api.rpc.state.getMetadata();
 *   console.log('Metadata:', metadata);
 *
 *   // Query on-chain storage
 *   const address = '14...';
 *   const balance = await api.query.system.account(address);
 *   console.log('Balance:', balance);
 *
 *
 *   // Subscribe to on-chain storage changes
 *   const unsub = await api.query.system.number((blockNumber) => {
 *     console.log(`Current block number: ${blockNumber}`);
 *   });
 *
 *   // Get pallet constants
 *   const ss58Prefix = api.consts.system.ss58Prefix;
 *   console.log('Polkadot ss58Prefix:', ss58Prefix)
 *
 *   // await unsub();
 *   // await api.disconnect();
 * }
 *
 * run().catch(console.error);
 * ```
 */
export class Dedot<ChainApi extends GenericSubstrateApi = SubstrateApi> extends EventEmitter<ApiEventNames> {
  readonly #provider: JsonRpcProvider;
  readonly #options: NormalizedApiOptions;

  #registry?: PortableRegistry;
  #metadata?: Metadata;
  #metadataLatest?: MetadataLatest;

  #genesisHash?: Hash;
  #runtimeVersion?: RuntimeVersion;
  #chainProperties?: ChainProperties;
  #runtimeChain?: string;
  #localCache?: IStorage;

  #runtimeSubscriptionUnsub?: Unsub;
  #healthTimer?: ReturnType<typeof setInterval>;

  /**
   * Use factory methods (`create`, `new`) to create `Dedot` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | NetworkEndpoint) {
    super();
    this.#options = this.#normalizeOptions(options);
    this.#provider = this.#getProvider();
  }

  /**
   * Factory method to create a new Dedot instance
   *
   * @param options
   */
  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<Dedot<ChainApi>> {
    return new Dedot<ChainApi>(options).connect();
  }

  /**
   * Alias for __Dedot.create__
   *
   * @param options
   */
  static async new<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<Dedot<ChainApi>> {
    return Dedot.create(options);
  }

  async #doConnect(): Promise<this> {
    this.provider.on('connected', this.#onConnected);
    this.provider.on('disconnected', this.#onDisconnected);
    this.provider.on('reconnecting', this.#onReconnecting);
    this.provider.on('message', this.#onMessage);
    this.provider.on('error', this.#onError);

    return new Promise<this>((resolve, reject) => {
      if (this.status === 'connected') {
        this.#onConnected().catch(reject);
      } else {
        this.provider.connect().catch(reject);
      }

      this.once('ready', () => {
        resolve(this);
      });
    });
  }

  #onConnected = async () => {
    this.emit('connected');
    await this.#initialize();
  };

  #onDisconnected = async () => {
    await this.#unsubscribeUpdates();
    this.emit('disconnected');
  };

  #onReconnecting = async () => {
    this.emit('reconnecting');
  };

  #onError = async (e: Error) => {
    this.emit('error', e);
  };

  #onMessage = async (data: any) => {
    this.emit('message', data);
  };

  /**
   * Initialize APIs before usage
   */
  async #initialize() {
    await this.#initializeLocalCache();

    // Fetching node information
    // TODO using json-rpc v2
    let [genesisHash, runtimeVersion, chainName, chainProps, metadata] = await Promise.all([
      this.jsonrpc.chain_getBlockHash(0),
      this.jsonrpc.state_getRuntimeVersion(),
      this.jsonrpc.system_chain(),
      this.jsonrpc.system_properties(),
      (await this.#shouldLoadPreloadMetadata()) ? this.#fetchMetadata() : Promise.resolve(undefined),
    ]);

    this.#genesisHash = genesisHash;
    this.#runtimeVersion = runtimeVersion;
    this.#chainProperties = chainProps;
    this.#runtimeChain = chainName;

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
      } catch {}
    }

    try {
      return $Metadata.tryDecode(await this.call.metadata.metadata());
    } catch {
      return await this.jsonrpc.state_getMetadata();
    }
  }

  #subscribeRuntimeUpgrades() {
    // Disable runtime upgrades subscriptions if using a catch all metadata
    if (this.#runtimeSubscriptionUnsub || this.hasCatchAllMetadata) {
      return;
    }

    this.jsonrpc
      .state_subscribeRuntimeVersion(async (runtimeVersion: RuntimeVersion) => {
        if (runtimeVersion.specVersion !== this.#runtimeVersion?.specVersion) {
          this.#runtimeVersion = runtimeVersion;
          const newMetadata = await this.#fetchMetadata();
          await this.#setupMetadata(newMetadata);
        }
      })
      .then((unsub) => {
        this.#runtimeSubscriptionUnsub = unsub;
      });
  }

  #subscribeHealth() {
    this.#unsubscribeHealth();

    this.#healthTimer = setInterval(() => {
      this.jsonrpc.system_health().catch(console.error);
    }, KEEP_ALIVE_INTERVAL);
  }

  #unsubscribeHealth() {
    if (!this.#healthTimer) {
      return;
    }

    clearInterval(this.#healthTimer);
    this.#healthTimer = undefined;
  }

  async #unsubscribeRuntimeUpdates() {
    if (!this.#runtimeSubscriptionUnsub) {
      return;
    }

    await this.#runtimeSubscriptionUnsub();
    this.#runtimeSubscriptionUnsub = undefined;
  }

  #subscribeUpdates() {
    this.#subscribeRuntimeUpgrades();
    this.#subscribeHealth();
  }

  async #unsubscribeUpdates() {
    await this.#unsubscribeRuntimeUpdates();
    this.#unsubscribeHealth();
  }

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
  #getProvider(): JsonRpcProvider {
    const { provider, endpoint } = this.#options;
    if (provider) {
      // assert(provider.hasSubscriptions, 'Only supports RPC Provider can make subscription requests');
      return provider;
    }

    if (endpoint) {
      return new WsProvider(endpoint);
    }

    // TODO support light-client

    return new WsProvider('ws://127.0.0.1:9944');
  }

  /**
   * @description Entry-point for executing JSON-RPCs to blockchain node.
   *
   * ```typescript
   * // Subscribe to new heads
   * api.jsonrpc.chain_subscribeNewHeads((header) => {
   *   console.log(header);
   * });
   *
   * // Execute arbitrary rpc method: `module_rpc_name`
   * const result = await api.jsonrpc.module_rpc_name();
   * ```
   */
  get jsonrpc(): ChainApi['jsonrpc'] {
    return newProxyChain<ChainApi>({ executor: new JsonRpcExecutor(this) }, 1, 2) as ChainApi['jsonrpc'];
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
    return newProxyChain<ChainApi>({ executor: new StorageQueryExecutor(this) }) as ChainApi['query'];
  }

  queryAt(blockHash: BlockHash): ChainApi['query'] {
    return newProxyChain<ChainApi>({ executor: new StorageQueryExecutor(this, blockHash) }) as ChainApi['query'];
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
    return newProxyChain<ChainApi>({ executor: new RuntimeApiExecutor(this) }) as ChainApi['call'];
  }

  callAt(blockHash: BlockHash): ChainApi['call'] {
    return newProxyChain<ChainApi>({ executor: new RuntimeApiExecutor(this, blockHash) }) as ChainApi['call'];
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
   * @description Current provider for api connection
   */
  get provider() {
    return this.#provider;
  }

  /**
   * @description Codec registry
   */
  get registry() {
    return this.#registry!;
  }

  /**
   * @description Check if metadata is present
   */
  get hasMetadata(): boolean {
    return !!this.#metadata && !!this.#metadataLatest;
  }

  get metadata(): Metadata {
    return this.#metadata!;
  }

  get metadataLatest(): MetadataLatest {
    return this.#metadataLatest!;
  }

  /**
   * Setup metadata for
   * @param metadata
   */
  setMetadata(metadata: Metadata) {
    this.#metadata = metadata;
    this.#metadataLatest = metadata.latest;
    this.#registry = new PortableRegistry(this.#metadataLatest);
  }

  /**
   * @description Connect to blockchain node
   */
  async connect(): Promise<this> {
    assert(this.status !== 'connected', 'Already connected!');
    return this.#doConnect();
  }

  /**
   * @description Disconnect to blockchain node
   */
  async disconnect() {
    await this.#unsubscribeUpdates();
    await this.#provider.disconnect();
  }

  /**
   * @description Clear local cache
   */
  async clearCache() {
    await this.#localCache?.clear();
  }

  /**
   * @description Check connection status of the api instance
   */
  get status(): ConnectionStatus {
    return this.provider.status;
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
    return this.#genesisHash;
  }

  /**
   * @description Runtime version of connected blockchain node
   */
  get runtimeVersion() {
    return this.#runtimeVersion;
  }

  /**
   * @description Chain properties of connected blockchain node
   */
  get chainProperties() {
    return this.#chainProperties;
  }

  /**
   * @description Runtime chain name of connected blockchain node
   */
  get runtimeChain() {
    return this.#runtimeChain;
  }

  get options() {
    return this.#options;
  }
}
