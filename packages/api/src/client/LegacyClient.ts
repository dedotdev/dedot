import { BlockHash, type Extrinsic, Hash, Header, PortableRegistry } from '@dedot/codecs';
import type { JsonRpcProvider } from '@dedot/providers';
import { Callback, GenericSubstrateApi, TxUnsub } from '@dedot/types';
import { ChainProperties } from '@dedot/types/json-rpc';
import { assert, HexString, noop } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RuntimeApiExecutor,
  StorageQueryExecutor,
  TxExecutor,
  ViewFunctionExecutor,
} from '../executor/index.js';
import { SubmittableExtrinsic } from '../extrinsic/submittable/SubmittableExtrinsic.js';
import { newProxyChain } from '../proxychain.js';
import { BaseStorageQuery, LegacyStorageQuery } from '../storage/index.js';
import type { ApiOptions, BlockExplorer, IChainSpec, ISubstrateClientAt, SubstrateRuntimeVersion } from '../types.js';
import { BaseSubstrateClient, ensurePresence } from './BaseSubstrateClient.js';
import { LegacyBlockExplorer } from './explorer/index.js';

const KEEP_ALIVE_INTERVAL = 10_000; // in ms

/**
 * @name LegacyClient
 * @description Promised-based API Client for Polkadot & Substrate
 *
 * Initialize API instance and interact with substrate-based network
 * ```typescript
 * import { Dedot } from 'dedot';
 * import type { PolkadotApi } from '@dedot/chaintypes/polkadot';
 *
 * const run = async () => {
 *   const api = await LegacyClient.new<PolkadotApi>('wss://rpc.polkadot.io');
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
export class LegacyClient<ChainApi extends GenericSubstrateApi = SubstrateApi> // prettier-end-here
  extends BaseSubstrateClient<ChainApi>
{
  #runtimeSubscriptionUnsub?: () => void;
  #healthTimer?: ReturnType<typeof setInterval>;
  protected _blockExplorer?: BlockExplorer;

  /**
   * Use factory methods (`create`, `new`) to create `Dedot` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | JsonRpcProvider) {
    super('legacy', options);
  }

  /**
   * Factory method to create a new Dedot instance
   *
   * @param options
   */
  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<LegacyClient<ChainApi>> {
    return new LegacyClient<ChainApi>(options).connect();
  }

  /**
   * Alias for __LegacyClient.create__
   *
   * @param options
   */
  static async new<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<LegacyClient<ChainApi>> {
    return LegacyClient.create(options);
  }

  protected override async beforeDisconnect() {
    await this.#unsubscribeUpdates();
  }

  /**
   * Initialize APIs before usage
   */
  protected override async doInitialize() {
    // Determine if this is the first initialization
    const shouldInitialize = !this._genesisHash;

    if (shouldInitialize) {
      // First load: Run all requests in parallel for speed
      let [genesisHash, runtimeVersion, metadata] = await Promise.all([
        this.rpc.chain_getBlockHash(0),
        this.#getRuntimeVersion(),
        (await this.shouldPreloadMetadata()) ? this.fetchMetadata() : Promise.resolve(undefined),
      ]);

      this._genesisHash = genesisHash;
      this._runtimeVersion = runtimeVersion;

      await this.setupMetadata(metadata);

      // Initialize block explorer
      this._blockExplorer = new LegacyBlockExplorer(this);

      // Subscribe to updates
      this.#subscribeUpdates();
    } else {
      // Reconnect: Only fetch runtime version to check for changes
      const newRuntimeVersion = await this.#getRuntimeVersion();

      // Only fetch metadata if spec version has changed
      if (newRuntimeVersion.specVersion !== this._runtimeVersion?.specVersion) {
        this._runtimeVersion = newRuntimeVersion;

        const metadata = await this.fetchMetadata();

        await this.setupMetadata(metadata);
      }
    }
  }

  protected override cleanUp() {
    super.cleanUp();
    this.#healthTimer = undefined;
    this.#runtimeSubscriptionUnsub = undefined;
    this._blockExplorer = undefined;
  }

  #subscribeRuntimeUpgrades() {
    if (this.#runtimeSubscriptionUnsub) return;

    this.#runtimeSubscriptionUnsub = this.block.best(async (block) => {
      if (!block.runtimeUpgraded) return;

      const { hash } = block;

      // Fetch the runtime version at this block
      const runtimeVersion: SubstrateRuntimeVersion = await this.#getRuntimeVersion(hash);

      // Check if the spec version has actually changed
      if (runtimeVersion.specVersion !== this.runtimeVersion?.specVersion) {
        this.startRuntimeUpgrade();

        this._runtimeVersion = runtimeVersion;

        const newMetadata = await this.fetchMetadata(hash, this._runtimeVersion);
        await this.setupMetadata(newMetadata);

        this.emit('runtimeUpgraded', this._runtimeVersion, block);

        this.doneRuntimeUpgrade();
      }
    });
  }

  async #getRuntimeVersion(at?: BlockHash): Promise<SubstrateRuntimeVersion> {
    return this.toSubstrateRuntimeVersion(await this.rpc.state_getRuntimeVersion(at));
  }

  #subscribeHealth() {
    this.#unsubscribeHealth();

    this.#healthTimer = setInterval(() => {
      this.rpc.system_health().catch(noop);
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

    try {
      this.#runtimeSubscriptionUnsub();
      this.#runtimeSubscriptionUnsub = undefined;
    } catch {
      // ignore
    }
  }

  #subscribeUpdates() {
    this.#subscribeRuntimeUpgrades();
    this.#subscribeHealth();
  }

  async #unsubscribeUpdates() {
    await this.#unsubscribeRuntimeUpdates();
    this.#unsubscribeHealth();
  }

  /// --- Public APIs ---
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
    return this.callAt();
  }

  // For internal use with caution
  protected override callAt(hash?: BlockHash): ChainApi['call'] {
    return newProxyChain({ executor: new RuntimeApiExecutor(this, hash) }) as ChainApi['call'];
  }

  get view(): ChainApi['view'] {
    return newProxyChain({ executor: new ViewFunctionExecutor(this) }) as ChainApi['view'];
  }

  /**
   * @description Entry-point for executing on-chain transactions
   *
   * ```typescript
   * // Make a transfer balance transaction
   * api.tx.balances.transferKeepAlive(<address>, <amount>)
   *    .signAndSend(<keyPair|address>, { signer }, ({ status }) => {
   *      console.log('Transaction status', status.type);
   *    });
   * ```
   */
  get tx(): ChainApi['tx'] {
    return newProxyChain({ executor: new TxExecutor(this) }) as ChainApi['tx'];
  }

  get block(): BlockExplorer {
    return ensurePresence(this._blockExplorer);
  }

  get chainSpec(): IChainSpec {
    return {
      chainName: (): Promise<string> => {
        return this.rpc.system_chain();
      },
      properties: (): Promise<ChainProperties> => {
        return this.rpc.system_properties();
      },
    };
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
    const cached = this._apiAtCache.get<ISubstrateClientAt<ChainApiAt>>(hash);
    if (cached) return cached;

    const parentHash = await this.#findParentHash(hash);
    const targetVersion = await this.#getRuntimeVersion(parentHash);

    let metadata = this.metadata;
    let registry: any = this.registry;
    if (targetVersion.specVersion !== this.runtimeVersion.specVersion) {
      const cachedMetadata = this.findMetadataInCache(targetVersion.specVersion);
      if (cachedMetadata) {
        metadata = cachedMetadata[0];
        registry = cachedMetadata[1];
      } else {
        metadata = await this.fetchMetadata(parentHash, targetVersion);
        registry = new PortableRegistry<ChainApiAt['types']>(metadata.latest, this.options.hasher);
      }
    }

    const api = {
      rpcVersion: 'legacy',
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

    // @ts-ignore Add queryMulti implementation for at-block queries
    api.queryMulti = (queries: { fn: GenericStorageQuery; args?: any[] }[]) => {
      return this.internalQueryMulti(queries, undefined, hash);
    };

    this._apiAtCache.set(hash, api);

    return api;
  }

  protected override getStorageQuery(): BaseStorageQuery {
    return new LegacyStorageQuery(this);
  }

  async #findParentHash(hash: Hash): Promise<Hash> {
    if (hash === this.genesisHash) {
      return this.genesisHash;
    } else {
      const header: Header | undefined = await this.rpc.chain_getHeader(hash);
      assert(header, `Header for ${hash} not found`);
      return header.parentHash;
    }
  }

  sendTx(tx: HexString | Extrinsic, callback?: Callback): TxUnsub {
    return SubmittableExtrinsic.fromTx(this, tx) // --
      .send((result) => {
        callback && callback(result);
      });
  }
}
