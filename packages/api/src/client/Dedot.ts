import { BlockHash, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import type { JsonRpcProvider } from '@dedot/providers';
import { GenericSubstrateApi, RpcLegacy, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import type { SubstrateApi } from '../chaintypes/index.js';
import {
  ConstantExecutor,
  ErrorExecutor,
  EventExecutor,
  RuntimeApiExecutor,
  StorageQueryExecutor,
  TxExecutor,
} from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import type { ApiOptions, ISubstrateClientAt, SubstrateRuntimeVersion } from '../types.js';
import { BaseSubstrateClient } from './BaseSubstrateClient.js';

const KEEP_ALIVE_INTERVAL = 10_000; // in ms

/**
 * @name Dedot
 * @description Promised-based API Client for Polkadot & Substrate
 *
 * Initialize API instance and interact with substrate-based network
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
export class Dedot<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi> extends BaseSubstrateClient<ChainApi> {
  #runtimeSubscriptionUnsub?: Unsub;
  #healthTimer?: ReturnType<typeof setInterval>;
  #apiAtCache: Record<BlockHash, ISubstrateClientAt<any>> = {};

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
  static async create<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<Dedot<ChainApi>> {
    return new Dedot<ChainApi>(options).connect();
  }

  /**
   * Alias for __Dedot.create__
   *
   * @param options
   */
  static async new<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | JsonRpcProvider,
  ): Promise<Dedot<ChainApi>> {
    return Dedot.create(options);
  }

  protected override onDisconnected = async () => {
    await this.#unsubscribeUpdates();
  };

  protected override async beforeDisconnect() {
    await this.#unsubscribeUpdates();
  }

  /**
   * Initialize APIs before usage
   */
  protected override async doInitialize() {
    let [genesisHash, runtimeVersion, metadata] = await Promise.all([
      this.rpc.chain_getBlockHash(0),
      this.#getRuntimeVersion(),
      (await this.shouldPreloadMetadata()) ? this.fetchMetadata() : Promise.resolve(undefined),
    ]);

    this._genesisHash = genesisHash;
    this._runtimeVersion = runtimeVersion;

    await this.setupMetadata(metadata);
    this.#subscribeUpdates();
  }

  protected override cleanUp() {
    super.cleanUp();
    this.#apiAtCache = {};
    this.#healthTimer = undefined;
    this.#runtimeSubscriptionUnsub = undefined;
  }

  #subscribeRuntimeUpgrades() {
    if (this.#runtimeSubscriptionUnsub) return;

    this.rpc
      .state_subscribeRuntimeVersion(async (runtimeVersion: RuntimeVersion) => {
        if (runtimeVersion.specVersion !== this.runtimeVersion?.specVersion) {
          this._runtimeVersion = this.#toSubstrateRuntimeVersion(runtimeVersion);
          const newMetadata = await this.fetchMetadata(undefined, this._runtimeVersion);
          await this.setupMetadata(newMetadata);
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

  /// --- Public APIs ---
  /**
   * @description Entry-point for inspecting constants (parameter types) for all pallets (modules).
   *
   * ```typescript
   * const ss58Prefix = api.consts.system.ss58Prefix;
   * console.log('ss58Prefix:', ss58Prefix)
   * ```
   */
  get consts(): ChainApi[RpcLegacy]['consts'] {
    return newProxyChain({ executor: new ConstantExecutor(this) }) as ChainApi[RpcLegacy]['consts'];
  }

  /**
   * @description Entry-point for executing query to on-chain storage.
   *
   * ```typescript
   * const balance = await api.query.system.account(<address>);
   * console.log('Balance:', balance);
   * ```
   */
  get query(): ChainApi[RpcLegacy]['query'] {
    return newProxyChain({ executor: new StorageQueryExecutor(this) }) as ChainApi[RpcLegacy]['query'];
  }

  /**
   * @description Entry-point for inspecting errors from metadata
   */
  get errors(): ChainApi[RpcLegacy]['errors'] {
    return newProxyChain({ executor: new ErrorExecutor(this) }) as ChainApi[RpcLegacy]['errors'];
  }

  /**
   * @description Entry-point for inspecting events from metadata
   */
  get events(): ChainApi[RpcLegacy]['events'] {
    return newProxyChain({ executor: new EventExecutor(this) }) as ChainApi[RpcLegacy]['events'];
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
  get call(): ChainApi[RpcLegacy]['call'] {
    return this.callAt();
  }

  // For internal use with caution
  protected override callAt(hash?: BlockHash): ChainApi[RpcLegacy]['call'] {
    return newProxyChain({ executor: new RuntimeApiExecutor(this, hash) }) as ChainApi[RpcLegacy]['call'];
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
  get tx(): ChainApi[RpcLegacy]['tx'] {
    return newProxyChain({ executor: new TxExecutor(this) }) as ChainApi[RpcLegacy]['tx'];
  }

  /**
   * Create a new API instance at a specific block hash
   * This is useful when we want to inspect the state of the chain at a specific block hash
   *
   * @param hash
   */
  async at<ChainApiAt extends GenericSubstrateApi = ChainApi[RpcLegacy]>(
    hash: BlockHash,
  ): Promise<ISubstrateClientAt<ChainApiAt>> {
    if (this.#apiAtCache[hash]) return this.#apiAtCache[hash];

    const targetVersion = await this.#getRuntimeVersion(hash);

    let metadata = this.metadata;
    let registry = this.registry;
    if (targetVersion.specVersion !== this.runtimeVersion.specVersion) {
      metadata = await this.fetchMetadata(hash, targetVersion);
      registry = new PortableRegistry(metadata.latest, this.options.hasher);
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

    this.#apiAtCache[hash] = api;

    return api;
  }
}
