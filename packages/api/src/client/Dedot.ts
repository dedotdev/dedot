import { $Metadata, BlockHash, Hash, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { type IStorage, LocalStorage } from '@dedot/storage';
import { GenericSubstrateApi, Unsub } from '@dedot/types';
import { calcRuntimeApiHash, ensurePresence as _ensurePresence, u8aToHex } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RuntimeApiExecutor,
  StorageQueryExecutor,
  TxExecutor,
} from '../executor/index.js';
import { JsonRpcClient } from '../json-rpc/index.js';
import { newProxyChain } from '../proxychain.js';
import type {
  ApiEvent,
  ApiOptions,
  ISubstrateClientAt,
  ISubstrateClient,
  MetadataKey,
  NetworkEndpoint,
  NormalizedApiOptions,
  SubstrateRuntimeVersion,
} from '../types.js';

export const KEEP_ALIVE_INTERVAL = 10_000; // in ms
export const CATCH_ALL_METADATA_KEY: MetadataKey = `RAW_META/ALL`;
export const SUPPORTED_METADATA_VERSIONS = [15, 14];
export const MetadataApiHash = calcRuntimeApiHash('Metadata'); // 0x37e397fc7c91f5e4

const MESSAGE: string = 'Make sure to call `.connect()` method first before using the API interfaces.';

function ensurePresence<T>(value: T): NonNullable<T> {
  return _ensurePresence(value, MESSAGE);
}

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
export class Dedot<ChainApi extends GenericSubstrateApi = SubstrateApi>
  extends JsonRpcClient<ChainApi, ApiEvent>
  implements ISubstrateClient<ChainApi, ApiEvent>
{
  readonly #options: NormalizedApiOptions;

  #registry?: PortableRegistry;
  #metadata?: Metadata;

  #genesisHash?: Hash;
  #runtimeVersion?: SubstrateRuntimeVersion;
  #localCache?: IStorage;

  #runtimeSubscriptionUnsub?: Unsub;
  #healthTimer?: ReturnType<typeof setInterval>;
  #apiAtCache: Record<BlockHash, ISubstrateClientAt<any>> = {};

  /**
   * Use factory methods (`create`, `new`) to create `Dedot` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | NetworkEndpoint) {
    super(options);
    this.#options = this.#normalizeOptions(options);
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

  /**
   * Initialize APIs before usage
   */
  async #initialize() {
    await this.#initializeLocalCache();

    let [genesisHash, runtimeVersion, metadata] = await Promise.all([
      this.rpc.chain_getBlockHash(0),
      this.#getRuntimeVersion(),
      (await this.#shouldLoadPreloadMetadata()) ? this.#fetchMetadata() : Promise.resolve(undefined),
    ]);

    this.#genesisHash = genesisHash;
    this.#runtimeVersion = runtimeVersion;

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

  async #fetchMetadata(at?: BlockHash, runtime?: SubstrateRuntimeVersion): Promise<Metadata> {
    // If there is no runtime, we assume that the node supports Metadata Api V2
    const supportedV2 = runtime ? runtime.apis[MetadataApiHash] === 2 : true;

    if (supportedV2) {
      // It makes sense to call metadata.metadataVersions to fetch the list of supported metadata versions first
      // But for now, this approach could potentially help save/reduce one rpc call to the server in case the node support v15
      // Question: Why not having a `metadata.metadataLatest` to fetch the latest version?
      for (const version of SUPPORTED_METADATA_VERSIONS) {
        try {
          const rawMetadata = await this.#callAt(at).metadata.metadataAtVersion(version);
          if (!rawMetadata) continue;

          return $Metadata.tryDecode(rawMetadata);
        } catch {}
      }
    }

    try {
      return $Metadata.tryDecode(await this.#callAt(at).metadata.metadata());
    } catch {
      return await this.rpc.state_getMetadata();
    }
  }

  #subscribeRuntimeUpgrades() {
    // Disable runtime upgrades subscriptions if using a catch all metadata
    if (this.#runtimeSubscriptionUnsub || this.hasCatchAllMetadata) {
      return;
    }

    this.rpc
      .state_subscribeRuntimeVersion(async (runtimeVersion: RuntimeVersion) => {
        if (runtimeVersion.specVersion !== this.#runtimeVersion?.specVersion) {
          this.#runtimeVersion = this.#toSubstrateRuntimeVersion(runtimeVersion);
          const newMetadata = await this.#fetchMetadata();
          await this.#setupMetadata(newMetadata);
        }
      })
      .then((unsub) => {
        this.#runtimeSubscriptionUnsub = unsub;
      });
  }

  async #getRuntimeVersion(at?: BlockHash): Promise<SubstrateRuntimeVersion> {
    return this.#toSubstrateRuntimeVersion(await this.rpc.state_getRuntimeVersion(at));
  }

  #toSubstrateRuntimeVersion(runtimeVersion: RuntimeVersion): SubstrateRuntimeVersion {
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

  #subscribeHealth() {
    this.#unsubscribeHealth();

    this.#healthTimer = setInterval(() => {
      this.rpc.system_health().catch(console.error);
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

  /**
   * @description Entry-point for inspecting constants (parameter types) for all pallets (modules).
   *
   * ```typescript
   * const ss58Prefix = api.consts.system.ss58Prefix;
   * console.log('ss58Prefix:', ss58Prefix)
   * ```
   */
  get consts(): ChainApi['consts'] {
    return newProxyChain({ executor: new ConstantExecutor(this) }) as ChainApi['consts'];
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
    return newProxyChain({ executor: new StorageQueryExecutor(this) }) as ChainApi['query'];
  }

  /**
   * @description Entry-point for inspecting errors from metadata
   */
  get errors(): ChainApi['errors'] {
    return newProxyChain({ executor: new ErrorExecutor(this) }) as ChainApi['errors'];
  }

  /**
   * @description Entry-point for inspecting events from metadata
   */
  get events(): ChainApi['events'] {
    return newProxyChain({ executor: new EventExecutor(this) }) as ChainApi['events'];
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
    return this.#callAt() as ChainApi['call'];
  }

  #callAt(at?: BlockHash): ChainApi['call'] {
    return newProxyChain({ executor: new RuntimeApiExecutor(this, at) }) as ChainApi['call'];
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
    return newProxyChain({ executor: new TxExecutor(this) }) as ChainApi['tx'];
  }

  /**
   * Create a new API instance at a specific block hash
   * This is useful when we want to inspect the state of the chain at a specific block hash
   *
   * @param hash
   */
  async at<ChainApiAt extends GenericSubstrateApi = ChainApi>(
    hash: BlockHash,
  ): Promise<ISubstrateClientAt<ChainApiAt>> {
    if (this.#apiAtCache[hash]) return this.#apiAtCache[hash];

    const targetVersion = await this.#getRuntimeVersion(hash);

    let metadata = this.metadata;
    let registry = this.registry;
    if (targetVersion.specVersion !== this.runtimeVersion.specVersion) {
      metadata = await this.#fetchMetadata(hash, targetVersion);
      registry = new PortableRegistry(metadata.latest, this.options.hasher);
    }

    const api = {
      atBlockHash: hash,
      options: this.options,
      genesisHash: this.genesisHash,
      runtimeVersion: targetVersion,
      metadata,
      registry,
      rpc: this.rpc,
    } as ISubstrateClientAt<ChainApiAt>;

    api.consts = newProxyChain({ executor: new ConstantExecutor(api) }) as ChainApiAt['consts'];
    api.query = newProxyChain({ executor: new StorageQueryExecutor(api) }) as ChainApiAt['query'];
    api.call = newProxyChain({ executor: new RuntimeApiExecutor(api) }) as ChainApiAt['call'];
    api.events = newProxyChain({ executor: new EventExecutor(api) }) as ChainApiAt['events'];
    api.errors = newProxyChain({ executor: new ErrorExecutor(api) }) as ChainApiAt['errors'];

    this.#apiAtCache[hash] = api;

    return api;
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
    this.#registry = new PortableRegistry(metadata.latest, this.options.hasher);
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
    this.#localCache = undefined;
    this.#apiAtCache = {};
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

  get options() {
    return this.#options;
  }
}
