import { $Metadata, BlockHash, Hash, Metadata, PortableRegistry, RuntimeVersion, StorageDataLike } from '@dedot/codecs';
import type { JsonRpcProvider } from '@dedot/providers';
import { type IStorage, LocalStorage } from '@dedot/storage';
import {
  Callback,
  GenericStorageQuery,
  GenericSubstrateApi,
  InjectedSigner,
  Query,
  QueryFnResult,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';
import {
  calcRuntimeApiHash,
  deferred,
  Deferred,
  ensurePresence as _ensurePresence,
  u8aToHex,
  LRUCache,
} from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import { ConstantExecutor, ErrorExecutor, EventExecutor } from '../executor/index.js';
import { isJsonRpcProvider, JsonRpcClient } from '../json-rpc/index.js';
import { newProxyChain } from '../proxychain.js';
import { BaseStorageQuery, QueryableStorage } from '../storage/index.js';
import type {
  ApiEvent,
  ApiOptions,
  ISubstrateClient,
  ISubstrateClientAt,
  JsonRpcClientOptions,
  MetadataKey,
  SubstrateRuntimeVersion,
} from '../types.js';

const SUPPORTED_METADATA_VERSIONS = [16, 15, 14];
const MetadataApiHash = calcRuntimeApiHash('Metadata'); // 0x37e397fc7c91f5e4
const API_AT_CACHE_CAPACITY = 64;
const API_AT_CACHE_TTL = 300_000; // 5 minutes

const MESSAGE: string = 'Make sure to call `.connect()` method first before using the API interfaces.';

export function ensurePresence<T>(value: T): NonNullable<T> {
  return _ensurePresence(value, MESSAGE);
}

/**
 * @name BaseSubstrateClient
 * @description Base & shared abstraction for Substrate API Clients
 */
export abstract class BaseSubstrateClient<
    Rv extends RpcVersion,
    ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
    Events extends string = ApiEvent,
  >
  extends JsonRpcClient<ChainApi, Events>
  implements ISubstrateClient<ChainApi[Rv], Events>
{
  protected _options: ApiOptions;

  protected _registry?: PortableRegistry<ChainApi[Rv]['types']>;
  protected _metadata?: Metadata;

  protected _genesisHash?: Hash;
  protected _runtimeVersion?: SubstrateRuntimeVersion;

  protected _localCache?: IStorage;
  protected _runtimeUpgrading?: Deferred<void>;
  protected _apiAtCache: LRUCache;

  protected constructor(
    public rpcVersion: RpcVersion,
    options: JsonRpcClientOptions | JsonRpcProvider,
  ) {
    super(options);
    this._options = this.normalizeOptions(options);
    this._apiAtCache = new LRUCache(API_AT_CACHE_CAPACITY, API_AT_CACHE_TTL);
  }

  /// --- Internal logics
  protected normalizeOptions(options: ApiOptions | JsonRpcProvider): ApiOptions {
    const defaultOptions = { throwOnUnknownApi: true };

    if (isJsonRpcProvider(options)) {
      return { ...defaultOptions, provider: options };
    } else {
      return { ...defaultOptions, ...options } as ApiOptions;
    }
  }

  protected async initializeLocalCache() {
    if (!this._options.cacheMetadata) return;

    // Initialize local cache
    if (this._options.cacheStorage) {
      this._localCache = this._options.cacheStorage;
      return;
    }

    try {
      this._localCache = new LocalStorage();
    } catch {
      throw new Error('localStorage is not available for caching, please provide a cacheStorage option');
    }
  }

  protected async setupMetadata(preloadMetadata: Metadata | undefined) {
    let metadata: Metadata | undefined = preloadMetadata;

    let shouldUpdateCache = !!metadata;

    if (!metadata) {
      metadata = this.getMetadataFromOptions(this._runtimeVersion);
    }

    const metadataKey = this.currentMetadataKey;
    try {
      if (this._localCache && this._options.cacheMetadata) {
        if (!metadata) {
          try {
            const cachedRawMetadata = await this._localCache.get(metadataKey);
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
        metadata = await this.fetchMetadata();

        if (this._options.cacheMetadata) shouldUpdateCache = true;
      }
    }

    if (shouldUpdateCache && this._localCache) {
      const encodedMetadata = u8aToHex($Metadata.tryEncode(metadata));
      await this.safeSetMetadataToCache(metadataKey, encodedMetadata);
    }

    if (!metadata) {
      throw new Error('Cannot load metadata');
    }

    this.setMetadata(metadata);
  }

  /**
   * Safely set metadata to cache with fallback cleanup if storage limit is exceeded
   */
  protected async safeSetMetadataToCache(key: string, value: string): Promise<void> {
    if (!this._localCache) return;

    try {
      // First attempt to set the metadata
      await this._localCache.set(key, value);
    } catch (error) {
      console.warn('Failed to store metadata in cache, attempting to clean up old entries:', error);

      try {
        // Get all keys that start with RAW_META/
        const allKeys = await this._localCache.keys();
        const metadataKeys = allKeys.filter((k) => k.startsWith('RAW_META/') && k !== key);

        // Remove all other metadata entries
        for (const metaKey of metadataKeys) {
          await this._localCache.remove(metaKey);
        }

        console.info(`Cleaned up ${metadataKeys.length} old metadata entries, trying again`);

        // Try again after cleanup
        await this._localCache.set(key, value);
      } catch (cleanupError) {
        // If it still fails after cleanup, log the error but continue
        console.error('Failed to store metadata even after cleanup:', cleanupError);
      }
    }
  }

  protected setMetadata(metadata: Metadata) {
    this._metadata = metadata;
    this._registry = new PortableRegistry<ChainApi[Rv]['types']>(metadata.latest, this.options.hasher);
  }

  protected getMetadataKey(runtime?: SubstrateRuntimeVersion): MetadataKey {
    return `RAW_META/${this._genesisHash || '0x'}/${runtime?.specVersion || '---'}`;
  }

  get currentMetadataKey(): string {
    return this.getMetadataKey(this._runtimeVersion);
  }

  protected async shouldPreloadMetadata() {
    if (this._options.metadata && Object.keys(this._options.metadata).length) {
      return false;
    }

    if (!this._options.cacheMetadata || !this._localCache) {
      return true;
    }

    // TODO improve this
    const keys = await this._localCache.keys();
    return !keys.some((k) => k.startsWith('RAW_META/'));
  }

  protected getMetadataFromOptions(runtime?: SubstrateRuntimeVersion): Metadata | undefined {
    if (!runtime || !this.options.metadata) return;

    const key = this.getMetadataKey(runtime);
    if (this.options.metadata[key]) {
      return $Metadata.tryDecode(this.options.metadata[key]);
    }
  }

  protected async fetchMetadata(hash?: BlockHash, runtime?: SubstrateRuntimeVersion): Promise<Metadata> {
    // First try finding metadata from the provided option
    const optionMetadata = this.getMetadataFromOptions(runtime);
    if (optionMetadata) return optionMetadata;

    // If there is no runtime, we assume that the node supports Metadata Api V2
    const supportedV2 = runtime ? runtime.apis[MetadataApiHash] === 2 : true;

    if (supportedV2) {
      const versions: number[] = ((await this.callAt(hash).metadata.metadataVersions()) as number[]) // --
        .filter((v) => SUPPORTED_METADATA_VERSIONS.includes(v))
        .sort((a, b) => b - a); // sort desc, bigger first

      for (const version of versions) {
        try {
          const rawMetadata = await this.callAt(hash).metadata.metadataAtVersion(version);
          if (!rawMetadata) continue;

          return $Metadata.tryDecode(rawMetadata);
        } catch {}
      }
    }

    try {
      return $Metadata.tryDecode(await this.callAt(hash).metadata.metadata());
    } catch {
      return await this.rpc.state_getMetadata();
    }
  }

  protected cleanUp() {
    this._registry = undefined;
    this._metadata = undefined;
    this._genesisHash = undefined;
    this._runtimeVersion = undefined;
    this._localCache = undefined;
    this._apiAtCache.clear();
  }

  /**
   * @description Clear local cache and API at-block cache
   * @param keepMetadataCache Keep the metadata cache, only clear other caches.
   */
  async clearCache(keepMetadataCache: boolean = false): Promise<void> {
    if (!keepMetadataCache) {
      await this._localCache?.clear();
    }

    this._apiAtCache.clear();
  }

  protected async doConnect(): Promise<this> {
    // @ts-ignore
    this.on('connected', this.onConnected);
    // @ts-ignore
    this.on('disconnected', this.onDisconnected);

    return new Promise<this>((resolve) => {
      // @ts-ignore
      this.once('ready', () => {
        resolve(this);
      });
    });
  }

  protected onConnected = async () => {
    await this.initialize();
  };

  protected onDisconnected = async () => {};

  protected async initialize() {
    await this.initializeLocalCache();
    await this.doInitialize();

    // @ts-ignore
    this.emit('ready');
  }

  protected async doInitialize() {
    throw new Error('Unimplemented!');
  }

  protected async beforeDisconnect() {}

  protected async afterDisconnect() {
    this.cleanUp();
  }

  protected toSubstrateRuntimeVersion(runtimeVersion: RuntimeVersion): SubstrateRuntimeVersion {
    return {
      ...runtimeVersion,
      apis: runtimeVersion.apis.reduce(
        (o, [name, version]) => {
          o[name] = version;
          return o;
        },
        {} as Record<string, number>,
      ),
    };
  }

  protected startRuntimeUpgrade() {
    this._runtimeUpgrading = deferred<void>();
  }

  protected doneRuntimeUpgrade() {
    if (!this._runtimeUpgrading) return;

    this._runtimeUpgrading.resolve();

    setTimeout(() => {
      this._runtimeUpgrading = undefined;
    });
  }

  protected async ensureRuntimeUpgraded() {
    if (!this._runtimeUpgrading) return;

    await this._runtimeUpgrading.promise;
  }

  /// --- Public APIs ---
  /**
   * @description Connect to blockchain node
   */
  async connect(): Promise<this> {
    const [api, _] = await Promise.all([this.doConnect(), super.connect()]);

    return api;
  }

  /**
   * @description Disconnect to blockchain node
   */
  async disconnect() {
    await this.beforeDisconnect();
    await super.disconnect();
    await this.afterDisconnect();
  }

  get options(): ApiOptions {
    return this._options;
  }

  get metadata(): Metadata {
    return ensurePresence(this._metadata);
  }

  get registry(): PortableRegistry<ChainApi[Rv]['types']> {
    return ensurePresence(this._registry);
  }

  get genesisHash(): Hash {
    return ensurePresence(this._genesisHash);
  }

  get runtimeVersion(): SubstrateRuntimeVersion {
    return ensurePresence(this._runtimeVersion);
  }

  async getRuntimeVersion(): Promise<SubstrateRuntimeVersion> {
    await this.ensureRuntimeUpgraded();
    return this.runtimeVersion;
  }

  get consts(): ChainApi[Rv]['consts'] {
    return newProxyChain({ executor: new ConstantExecutor(this) }) as ChainApi[Rv]['consts'];
  }

  get errors(): ChainApi[Rv]['errors'] {
    return newProxyChain({ executor: new ErrorExecutor(this) }) as ChainApi[Rv]['errors'];
  }

  get events(): ChainApi[Rv]['events'] {
    return newProxyChain({ executor: new EventExecutor(this) }) as ChainApi[Rv]['events'];
  }

  get query(): ChainApi[Rv]['query'] {
    throw new Error('Unimplemented!');
  }

  get view(): ChainApi[Rv]['view'] {
    throw new Error('Unimplemented!');
  }

  get call(): ChainApi[Rv]['call'] {
    return this.callAt();
  }

  // For internal use with caution
  protected callAt(hash?: BlockHash): ChainApi[Rv]['call'] {
    throw new Error('Unimplemented!');
  }

  get tx(): ChainApi[Rv]['tx'] {
    throw new Error('Unimplemented!');
  }

  at<ChainApiAt extends GenericSubstrateApi = ChainApi[Rv]>(hash: BlockHash): Promise<ISubstrateClientAt<ChainApiAt>> {
    throw new Error('Unimplemented!');
  }

  setSigner(signer?: InjectedSigner): void {
    this._options.signer = signer;
  }

  /**
   * Query multiple storage items in a single call
   *
   * This method allows you to query multiple storage items in a single call or set up a subscription
   * to multiple storage items. It provides type safety for both the query functions and their results.
   *
   * @example
   * // One-time query with type-safe results
   * const [balance, blockNumber] = await client.queryMulti([
   *   { fn: client.query.system.account, args: [ALICE] },
   *   { fn: client.query.system.number, args: [] }
   * ]);
   * // balance will be typed as AccountInfo
   * // blockNumber will be typed as number
   *
   *
   * @template Fns Array of storage query functions
   * @param queries - Array of query specifications, each with a function and optional arguments
   * @param callback - Optional callback for subscription-based queries
   * @returns For one-time queries: Array of decoded values with proper types; For subscriptions: Unsubscribe function
   */
  queryMulti<Fns extends GenericStorageQuery[]>(
    queries: { [K in keyof Fns]: Query<Fns[K]> }, // prettier-end-here
  ): Promise<{ [K in keyof Fns]: QueryFnResult<Fns[K]> }>;
  queryMulti<Fns extends GenericStorageQuery[]>(
    queries: { [K in keyof Fns]: Query<Fns[K]> },
    callback: Callback<{ [K in keyof Fns]: QueryFnResult<Fns[K]> }>,
  ): Promise<Unsub>;
  async queryMulti(
    queries: { fn: GenericStorageQuery; args?: any[] }[],
    callback?: Callback<any[]>,
  ): Promise<any[] | Unsub> {
    // Extract keys from queries
    const keys = queries.map((q) => q.fn.rawKey(...(q.args || [])));

    const decodeValue = (query: GenericStorageQuery, rawValue?: StorageDataLike | null) => {
      // Get the QueryableStorage instance from the query function
      const entry = new QueryableStorage(this.registry, query.meta.pallet, query.meta.name);

      // Decode the value
      return entry.decodeValue(rawValue);
    };

    // If a callback is provided, set up a subscription
    if (callback) {
      return this.getStorageQuery().subscribe(keys, (results) => {
        callback(queries.map((q, i) => decodeValue(q.fn, results[keys[i]])));
      });
    } else {
      const results = await this.getStorageQuery().query(keys);
      return queries.map((q, i) => decodeValue(q.fn, results[keys[i]]));
    }
  }

  protected getStorageQuery(): BaseStorageQuery {
    throw new Error('Unimplemented!');
  }
}
