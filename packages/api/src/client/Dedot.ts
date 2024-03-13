import { WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import type { SubstrateApi } from '@dedot/chaintypes';
import { $Metadata, BlockHash, Hash, Metadata, MetadataLatest, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { ChainProperties, GenericSubstrateApi, Unsub } from '@dedot/types';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RpcExecutor,
  RuntimeApiExecutor,
  StorageQueryExecutor,
  TxExecutor,
} from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import { ApiOptions, MetadataKey, NetworkEndpoint, NormalizedApiOptions } from '../types.js';
import { hexAddPrefix, u8aToHex } from '@polkadot/util';
import { IStorage, LocalStorage } from '@dedot/storage';
import { assert } from '@dedot/utils';

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
export class Dedot<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #provider: ProviderInterface;
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
   * @protected
   */
  protected constructor(options: ApiOptions | NetworkEndpoint) {
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
    const api = new Dedot<ChainApi>(options);

    if (api.provider instanceof WsProvider) {
      await api.provider.isReady;
    }

    await api.init();

    return api;
  }

  /**
   * Alias for __Dedot.create__
   * @param options
   */
  static async new<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<Dedot<ChainApi>> {
    return Dedot.create(options);
  }

  /**
   * Initialize APIs before usage
   */
  async init() {
    await this.#initializeLocalCache();

    // Fetching node information
    let [genesisHash, runtimeVersion, chainName, chainProps, metadata] = await Promise.all([
      this.rpc.chain.getBlockHash(0),
      this.rpc.state.getRuntimeVersion(),
      this.rpc.system.chain(),
      this.rpc.system.properties(),
      (await this.#shouldLoadPreloadMetadata()) ? this.#fetchMetadata() : Promise.resolve(undefined),
    ]);

    this.#genesisHash = genesisHash;
    this.#runtimeVersion = runtimeVersion;
    this.#chainProperties = chainProps;
    this.#runtimeChain = chainName;

    await this.#setupMetadata(metadata);
    this.#subscribeUpdates();
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
      return await this.rpc.state.getMetadata();
    }
  }

  #subscribeRuntimeUpgrades() {
    // Disable runtime upgrades subscriptions if using a catch all metadata
    if (this.#runtimeSubscriptionUnsub || !this.hasSubscriptions || this.hasCatchAllMetadata) {
      return;
    }

    this.rpc.state
      .subscribeRuntimeVersion(async (runtimeVersion: RuntimeVersion) => {
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
      this.rpc.system.health().catch(console.error);
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
      return { endpoint: options };
    } else {
      let { metadata } = options || {};
      if (metadata && typeof metadata === 'string') {
        metadata = {
          [CATCH_ALL_METADATA_KEY]: hexAddPrefix(metadata),
        };
      }

      return { ...options, metadata } as NormalizedApiOptions;
    }
  }

  #getProvider(): ProviderInterface {
    const { provider, endpoint } = this.#options;
    if (provider) {
      assert(provider.hasSubscriptions, 'Only supports RPC Provider can make subscription requests');
      return provider;
    }

    if (endpoint) {
      if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
        return new WsProvider(endpoint);
      } else {
        throw new Error('Invalid RPC network endpoint, a valid endpoint should start with `wss://`, `ws://`');
      }
    }

    // TODO support light-client

    return new WsProvider();
  }

  /**
   * @description Entry-point for executing RPCs to blockchain node.
   *
   * ```typescript
   * // Subscribe to new heads
   * api.rpc.chain.subscribeNewHeads((header) => {
   *   console.log(header);
   * });
   *
   * // Execute arbitrary rpc method: `module_rpc_name`
   * const result = await api.rpc.module.rpc_name();
   * ```
   */
  get rpc(): ChainApi['rpc'] {
    // TODO add executable carrier to support calling arbitrary rpc methods via api.rpc(<method>)
    return newProxyChain<ChainApi>({ executor: new RpcExecutor(this) }) as ChainApi['rpc'];
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
   * @description Check if current provider can make subscription request (e.: via WebSocket)
   */
  get hasSubscriptions(): boolean {
    return this.provider.hasSubscriptions;
  }

  /**
   * @description Check if it's connected to the blockchain node
   */
  get isConnected(): boolean {
    return this.provider.isConnected;
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
