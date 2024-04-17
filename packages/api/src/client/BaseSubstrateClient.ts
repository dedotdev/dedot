import { $Metadata, Hash, Metadata, PortableRegistry } from '@dedot/codecs';
import type {
  ApiEvent,
  ApiOptions,
  HashOrSource,
  ISubstrateClient,
  JsonRpcClientOptions,
  MetadataKey,
  NetworkEndpoint,
  NormalizedApiOptions,
  SubstrateChainProperties,
  SubstrateRuntimeVersion,
} from '../types.js';
import type { SubstrateApi } from '../chaintypes/index.js';
import { ensurePresence as _ensurePresence, u8aToHex } from '@dedot/utils';
import { JsonRpcClient } from '../json-rpc/index.js';
import { RpcV2, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { type IStorage, LocalStorage } from '@dedot/storage';
import { newProxyChain } from '../proxychain.js';
import { ConstantExecutor, ErrorExecutor, EventExecutor } from '../executor/index.js';

export const KEEP_ALIVE_INTERVAL = 10_000; // in ms
export const CATCH_ALL_METADATA_KEY: MetadataKey = `RAW_META/ALL`;
export const SUPPORTED_METADATA_VERSIONS = [15, 14];

const MESSAGE: string = 'Make sure to call `.connect()` method first before using the API interfaces.';

export function ensurePresence<T>(value: T): NonNullable<T> {
  return _ensurePresence(value, MESSAGE);
}

export abstract class BaseSubstrateClient<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>
  extends JsonRpcClient<ChainApi[RpcVersion], ApiEvent>
  implements ISubstrateClient<ChainApi[RpcVersion]>
{
  protected _options: NormalizedApiOptions;

  protected _registry?: PortableRegistry;
  protected _metadata?: Metadata;

  protected _genesisHash?: Hash;
  protected _runtimeVersion?: SubstrateRuntimeVersion;
  protected _chainProperties?: SubstrateChainProperties;
  protected _runtimeChain?: string;

  protected _localCache?: IStorage;

  protected constructor(
    public rpcVersion: RpcVersion,
    options: JsonRpcClientOptions | NetworkEndpoint,
  ) {
    super(options);
    this._options = this.normalizeOptions(options);
  }

  /// --- Internal logics
  protected normalizeOptions(options: ApiOptions | NetworkEndpoint): NormalizedApiOptions {
    if (typeof options === 'string') {
      return { ...this.getDefaultOptions(), endpoint: options };
    } else {
      let { metadata } = options || {};
      if (metadata && typeof metadata === 'string') {
        metadata = {
          [CATCH_ALL_METADATA_KEY]: metadata,
        };
      }

      return { ...this.getDefaultOptions(), ...options, metadata } as NormalizedApiOptions;
    }
  }

  protected getDefaultOptions(): Partial<NormalizedApiOptions> {
    return {
      throwOnUnknownApi: true,
    };
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

    const metadataKey = this.currentMetadataKey;
    const optMetadataBundles = this._options.metadata;
    let shouldUpdateCache = !!metadata;

    if (optMetadataBundles && !metadata) {
      const optRawMetadata = optMetadataBundles[CATCH_ALL_METADATA_KEY] || optMetadataBundles[metadataKey];
      if (optRawMetadata) {
        metadata = $Metadata.tryDecode(optRawMetadata);
      }
    }

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

  get currentMetadataKey(): string {
    return `RAW_META/${this._genesisHash || '0x'}/${this._runtimeVersion?.specVersion || '---'}`;
  }

  protected async shouldLoadPreloadMetadata() {
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

  protected async fetchMetadata(): Promise<Metadata> {
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
      return await this.rpc.state_getMetadata();
    }
  }

  protected cleanUp() {
    this._registry = undefined;
    this._metadata = undefined;
    this._genesisHash = undefined;
    this._runtimeVersion = undefined;
    this._chainProperties = undefined;
    this._runtimeChain = undefined;
    this._localCache = undefined;
  }

  /**
   * @description Clear local cache
   */
  async clearCache() {
    await this._localCache?.clear();
  }

  /**
   * @description Check if the api instance is using a catch-all metadata
   */
  get hasCatchAllMetadata(): boolean {
    return !!this._options.metadata && !!this._options.metadata[CATCH_ALL_METADATA_KEY];
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

  protected async doInitialize() {}

  protected async beforeDisconnect() {}
  protected async afterDisconnect() {
    this.cleanUp();
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

  get options(): NormalizedApiOptions {
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

  get runtimeChain(): string {
    return ensurePresence(this._runtimeChain);
  }

  get runtimeVersion(): SubstrateRuntimeVersion {
    return ensurePresence(this._runtimeVersion);
  }

  get chainProperties(): SubstrateChainProperties {
    return ensurePresence(this._chainProperties);
  }

  /**
   * @description Entry-point for inspecting constants (parameter types) for all pallets (modules).
   *
   * ```typescript
   * const ss58Prefix = api.consts.system.ss58Prefix;
   * console.log('ss58Prefix:', ss58Prefix)
   * ```
   */
  get consts(): ChainApi[RpcVersion]['consts'] {
    return newProxyChain<ChainApi>({ executor: new ConstantExecutor(this) }) as ChainApi[RpcV2]['consts'];
  }

  /**
   * @description Entry-point for inspecting errors from metadata
   */
  get errors(): ChainApi[RpcVersion]['errors'] {
    return newProxyChain<ChainApi>({ executor: new ErrorExecutor(this) }) as ChainApi[RpcVersion]['errors'];
  }

  /**
   * @description Entry-point for inspecting events from metadata
   */
  get events(): ChainApi[RpcVersion]['events'] {
    return newProxyChain<ChainApi>({ executor: new EventExecutor(this) }) as ChainApi[RpcVersion]['events'];
  }

  /**
   * @description Entry-point for executing query to on-chain storage.
   *
   * ```typescript
   * const balance = await api.query.system.account(<address>);
   * console.log('Balance:', balance);
   * ```
   */
  get query(): ChainApi[any]['query'] {
    throw new Error('Unimplemented!');
  }
  queryAt(blockHash: HashOrSource): ChainApi[any]['query'] {
    throw new Error('Unimplemented!');
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
  get call(): ChainApi[any]['call'] {
    throw new Error('Unimplemented!');
  }

  callAt(blockHash: HashOrSource): ChainApi[any]['call'] {
    throw new Error('Unimplemented!');
  }

  get tx(): ChainApi[any]['tx'] {
    throw new Error('Unimplemented!');
  }
}
