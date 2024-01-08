import { HttpProvider, WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { $Metadata, CodecRegistry, Hash, Metadata, MetadataLatest } from '@delightfuldot/codecs';
import { ChainProperties, GenericSubstrateApi, RuntimeVersion, Unsub } from '@delightfuldot/types';
import { ConstantExecutor, ErrorExecutor, EventExecutor, RpcExecutor, StorageQueryExecutor } from './executor';
import { newProxyChain } from './proxychain';
import { ApiOptions, NetworkEndpoint, NormalizedApiOptions } from './types';
import { ensurePresence } from '@delightfuldot/utils';
import localforage from 'localforage';
import { hexAddPrefix, u8aToHex } from '@polkadot/util';

export const KEEP_ALIVE_INTERVAL = 10_000; // ms
export const METADATA_KEY_PREFIX = 'RAW_META';
export const CATCH_ALL_METADATA_KEY = `${METADATA_KEY_PREFIX}/ALL`;

export default class DelightfulApi<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #provider: ProviderInterface;
  readonly #registry: CodecRegistry;
  readonly #options: NormalizedApiOptions;
  #metadata?: Metadata;
  #metadataLatest?: MetadataLatest;

  #genesisHash?: Hash;
  #runtimeVersion?: RuntimeVersion;
  #chainProperties?: ChainProperties;
  #runtimeChain?: string;
  #localCache?: LocalForage;

  #runtimeSubscriptionUnsub?: Unsub;
  #healthTimer?: ReturnType<typeof setInterval>;

  protected constructor(options: ApiOptions | NetworkEndpoint) {
    this.#options = this.#normalizeOptions(options);
    this.#provider = this.#getProvider();
    this.#registry = new CodecRegistry();
  }

  /**
   * Create a new DelightfulApi instance
   * @param options
   */
  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<DelightfulApi<ChainApi>> {
    const api = new DelightfulApi<ChainApi>(options);

    if (api.provider instanceof WsProvider) {
      await api.provider.isReady;
    }

    await api.init();

    return api;
  }

  /**
   * Alias for __DelightfulApi.create__
   * @param options
   */
  static async new<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<DelightfulApi<ChainApi>> {
    return DelightfulApi.create(options);
  }

  async init() {
    await this.#initializeLocalCache();

    // Fetching node information
    let [genesisHash, runtimeVersion, chainName, chainProps, metadata] = await Promise.all([
      this.rpc.chain.getBlockHash(0),
      this.rpc.state.getRuntimeVersion(),
      this.rpc.system.chain(),
      this.rpc.system.properties(),
      (await this.#shouldLoadPreloadMetadata()) ? this.rpc.state.getMetadata() : Promise.resolve(undefined),
    ]);

    this.#genesisHash = genesisHash;
    this.#runtimeVersion = runtimeVersion;
    this.#chainProperties = chainProps;
    this.#runtimeChain = chainName;

    await this.#setupMetadata(metadata);
    this.#subscribeUpdates();
  }

  async #initializeLocalCache() {
    // Initialize local cache
    if (this.#options.cacheMetadata) {
      try {
        // TODO add a custom driver to support nodejs
        this.#localCache = localforage.createInstance({
          driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
          name: 'DelightfulApiCache',
          storeName: 'LocalCache',
        });

        // Verify the storage is working
        await this.#localCache.setItem('testKey', 'testValue');
        await this.#localCache.removeItem('testKey');
      } catch (e: any) {
        this.#localCache = undefined;
        this.#options.cacheMetadata = false;

        console.error('Cannot initialize local cache in this environment, disable metadata caching');
      }
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

    if (this.#localCache && this.#options.cacheMetadata) {
      if (!metadata) {
        try {
          const cachedRawMetadata = await this.#localCache.getItem(metadataKey);
          if (cachedRawMetadata) {
            metadata = $Metadata.tryDecode(cachedRawMetadata);
          }
        } catch (e) {
          console.error('Cannot decode raw metadata, try fetching fresh metadata from chain.', e);
        } finally {
          if (!metadata) {
            metadata = await this.rpc.state.getMetadata();

            shouldUpdateCache = true;
          }
        }
      }

      if (shouldUpdateCache) {
        await this.#localCache.setItem(metadataKey, u8aToHex($Metadata.tryEncode(metadata)));
      }
    }

    if (!metadata) {
      throw new Error('Cannot load metadata');
    }

    this.setMetadata(metadata);
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
          const newMetadata = await this.rpc.state.getMetadata();
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
      let { metadata } = options;
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
    if (provider) return provider;

    if (endpoint) {
      if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
        return new WsProvider(endpoint);
      } else if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return new HttpProvider(endpoint);
      }
    }

    // TODO validate endpoint url
    // TODO support light-client

    return new WsProvider();
  }

  get rpc(): ChainApi['rpc'] {
    return newProxyChain<ChainApi>({ executor: new RpcExecutor(this) }) as ChainApi['rpc'];
  }

  get consts(): ChainApi['consts'] {
    return newProxyChain<ChainApi>({ executor: new ConstantExecutor(this) }) as ChainApi['consts'];
  }

  get query(): ChainApi['query'] {
    return newProxyChain<ChainApi>({ executor: new StorageQueryExecutor(this) }) as ChainApi['query'];
  }

  get errors(): ChainApi['errors'] {
    return newProxyChain<ChainApi>({ executor: new ErrorExecutor(this) }) as ChainApi['errors'];
  }

  get events(): ChainApi['events'] {
    return newProxyChain<ChainApi>({ executor: new EventExecutor(this) }) as ChainApi['events'];
  }

  get provider() {
    return this.#provider;
  }

  get registry() {
    return this.#registry;
  }

  get hasMetadata(): boolean {
    return !!this.#metadata && !!this.#metadataLatest;
  }

  get metadata(): Metadata {
    return ensurePresence(this.#metadata);
  }

  get metadataLatest(): MetadataLatest {
    return ensurePresence(this.#metadataLatest);
  }

  setMetadata(metadata: Metadata) {
    this.#metadata = metadata;
    this.#metadataLatest = metadata.latest;
    this.registry.setMetadata(this.#metadataLatest);
  }

  async disconnect() {
    await this.#unsubscribeUpdates();

    await this.#provider.disconnect();
  }

  async clearCache() {
    await this.#localCache?.clear();
  }

  get currentMetadataKey(): string {
    return `RAW_META/${this.#genesisHash || '0x'}/${this.#runtimeVersion?.specVersion || '---'}`;
  }

  get hasSubscriptions(): boolean {
    return this.provider.hasSubscriptions;
  }

  /**
   * Check if the api instance is using a catch-all metadata
   */
  get hasCatchAllMetadata(): boolean {
    return !!this.#options.metadata && !!this.#options.metadata[CATCH_ALL_METADATA_KEY];
  }
}
