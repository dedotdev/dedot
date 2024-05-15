import { $Metadata, BlockHash, Hash, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import type { JsonRpcProvider } from '@dedot/providers';
import { type IStorage, LocalStorage } from '@dedot/storage';
import { GenericSubstrateApi, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { calcRuntimeApiHash, ensurePresence as _ensurePresence, u8aToHex } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import { ConstantExecutor, ErrorExecutor, EventExecutor } from '../executor/index.js';
import { isJsonRpcProvider, JsonRpcClient } from '../json-rpc/index.js';
import { newProxyChain } from '../proxychain.js';
import type {
  ApiEvent,
  ApiOptions,
  ISubstrateClient,
  ISubstrateClientAt,
  JsonRpcClientOptions,
  MetadataKey,
  SubstrateRuntimeVersion,
} from '../public-types.js';

const SUPPORTED_METADATA_VERSIONS = [15, 14];
const MetadataApiHash = calcRuntimeApiHash('Metadata'); // 0x37e397fc7c91f5e4

const MESSAGE: string = 'Make sure to call `.connect()` method first before using the API interfaces.';

export function ensurePresence<T>(value: T): NonNullable<T> {
  return _ensurePresence(value, MESSAGE);
}

/**
 * @name BaseSubstrateClient
 * @description Base & shared abstraction for Substrate API Clients
 */
export abstract class BaseSubstrateClient<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>
  extends JsonRpcClient<ChainApi[RpcVersion], ApiEvent>
  implements ISubstrateClient<ChainApi[RpcVersion]>
{
  protected _options: ApiOptions;

  protected _registry?: PortableRegistry;
  protected _metadata?: Metadata;

  protected _genesisHash?: Hash;
  protected _runtimeVersion?: SubstrateRuntimeVersion;

  protected _localCache?: IStorage;

  protected constructor(
    public rpcVersion: RpcVersion,
    options: JsonRpcClientOptions | JsonRpcProvider,
  ) {
    super(options);
    this._options = this.normalizeOptions(options);
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
      await this._localCache.set(metadataKey, u8aToHex($Metadata.tryEncode(metadata)));
    }

    if (!metadata) {
      throw new Error('Cannot load metadata');
    }

    this.setMetadata(metadata);
  }

  protected setMetadata(metadata: Metadata) {
    this._metadata = metadata;
    this._registry = new PortableRegistry(metadata.latest, this.options.hasher);
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
      // It makes sense to call metadata.metadataVersions to fetch the list of supported metadata versions first
      // But for now, this approach could potentially help save/reduce one rpc call to the server in case the node support v15
      // Question: Why not having a `metadata.metadataLatest` to fetch the latest version?
      for (const version of SUPPORTED_METADATA_VERSIONS) {
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
  }

  /**
   * @description Clear local cache
   */
  async clearCache() {
    await this._localCache?.clear();
  }

  protected async doConnect(): Promise<this> {
    this.on('connected', this.onConnected);
    this.on('disconnected', this.onDisconnected);

    return new Promise<this>((resolve) => {
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

  get registry(): PortableRegistry {
    return ensurePresence(this._registry);
  }

  get genesisHash(): Hash {
    return ensurePresence(this._genesisHash);
  }

  get runtimeVersion(): SubstrateRuntimeVersion {
    return ensurePresence(this._runtimeVersion);
  }

  get consts(): ChainApi[RpcVersion]['consts'] {
    return newProxyChain({ executor: new ConstantExecutor(this) }) as ChainApi[RpcVersion]['consts'];
  }

  get errors(): ChainApi[RpcVersion]['errors'] {
    return newProxyChain({ executor: new ErrorExecutor(this) }) as ChainApi[RpcVersion]['errors'];
  }

  get events(): ChainApi[RpcVersion]['events'] {
    return newProxyChain({ executor: new EventExecutor(this) }) as ChainApi[RpcVersion]['events'];
  }

  get query(): ChainApi[RpcVersion]['query'] {
    throw new Error('Unimplemented!');
  }

  get call(): ChainApi[RpcVersion]['call'] {
    return this.callAt();
  }

  // For internal use with caution
  protected callAt(hash?: BlockHash): ChainApi[RpcVersion]['call'] {
    throw new Error('Unimplemented!');
  }

  get tx(): ChainApi[RpcVersion]['tx'] {
    throw new Error('Unimplemented!');
  }

  at<ChainApiAt extends GenericSubstrateApi = ChainApi[RpcVersion]>(
    hash: BlockHash,
  ): Promise<ISubstrateClientAt<ChainApiAt>> {
    throw new Error('Unimplemented!');
  }
}
