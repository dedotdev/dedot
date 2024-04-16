import type { SubstrateApi } from '../chaintypes/index.js';
import { RuntimeVersion } from '@dedot/codecs';
import { RpcLegacy, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import { RuntimeApiExecutor, StorageQueryExecutor, TxExecutor } from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import type { ApiOptions, HashOrSource, NetworkEndpoint, SubstrateRuntimeVersion } from '../types.js';
import { BaseSubstrateClient, KEEP_ALIVE_INTERVAL } from './BaseSubstrateClient.js';

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
  private _runtimeSubscriptionUnsub?: Unsub;
  private _healthTimer?: ReturnType<typeof setInterval>;

  /**
   * Use factory methods (`create`, `new`) to create `Dedot` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | NetworkEndpoint) {
    super('legacy', options);
  }

  /**
   * Factory method to create a new Dedot instance
   *
   * @param options
   */
  static async create<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<Dedot<ChainApi>> {
    return new Dedot<ChainApi>(options).connect();
  }

  /**
   * Alias for __Dedot.create__
   *
   * @param options
   */
  static async new<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<Dedot<ChainApi>> {
    return Dedot.create(options);
  }

  onDisconnected = async () => {
    await this.unsubscribeUpdates();
  };

  /**
   * Initialize APIs before usage
   */
  async doInitialize() {
    // Fetching node information
    let [genesisHash, runtimeVersion, chainName, chainProps, metadata] = await Promise.all([
      this.rpc.chain_getBlockHash(0),
      this.rpc.state_getRuntimeVersion(),
      this.rpc.system_chain(),
      this.rpc.system_properties(),
      (await this.shouldLoadPreloadMetadata()) ? this.fetchMetadata() : Promise.resolve(undefined),
    ]);

    this._genesisHash = genesisHash;
    this._runtimeChain = chainName;
    this._runtimeVersion = this.toSubstrateRuntimeVersion(runtimeVersion);
    this._chainProperties = chainProps;

    await this.setupMetadata(metadata);
    this.subscribeUpdates();
  }

  private subscribeRuntimeUpgrades() {
    // Disable runtime upgrades subscriptions if using a catch all metadata
    if (this._runtimeSubscriptionUnsub || this.hasCatchAllMetadata) {
      return;
    }

    this.rpc
      .state_subscribeRuntimeVersion(async (runtimeVersion: RuntimeVersion) => {
        if (runtimeVersion.specVersion !== this._runtimeVersion?.specVersion) {
          this._runtimeVersion = this.toSubstrateRuntimeVersion(runtimeVersion);
          const newMetadata = await this.fetchMetadata();
          await this.setupMetadata(newMetadata);
        }
      })
      .then((unsub) => {
        this._runtimeSubscriptionUnsub = unsub;
      });
  }

  private toSubstrateRuntimeVersion(runtimeVersion: RuntimeVersion): SubstrateRuntimeVersion {
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

  private subscribeHealth() {
    this.unsubscribeHealth();

    this._healthTimer = setInterval(() => {
      this.rpc.system_health().catch(console.error);
    }, KEEP_ALIVE_INTERVAL);
  }

  private unsubscribeHealth() {
    if (!this._healthTimer) {
      return;
    }

    clearInterval(this._healthTimer);
    this._healthTimer = undefined;
  }

  async unsubscribeRuntimeUpdates() {
    if (!this._runtimeSubscriptionUnsub) {
      return;
    }

    await this._runtimeSubscriptionUnsub();
    this._runtimeSubscriptionUnsub = undefined;
  }

  private subscribeUpdates() {
    this.subscribeRuntimeUpgrades();
    this.subscribeHealth();
  }

  async unsubscribeUpdates() {
    await this.unsubscribeRuntimeUpdates();
    this.unsubscribeHealth();
  }

  async beforeDisconnect() {
    await this.unsubscribeUpdates();
  }

  get query(): ChainApi[RpcLegacy]['query'] {
    return newProxyChain<ChainApi>({ executor: new StorageQueryExecutor(this) }) as ChainApi[RpcLegacy]['query'];
  }

  queryAt(blockHash: HashOrSource): ChainApi[RpcLegacy]['query'] {
    return newProxyChain<ChainApi>({
      executor: new StorageQueryExecutor(this, blockHash),
    }) as ChainApi[RpcLegacy]['query'];
  }

  get call(): ChainApi[RpcLegacy]['call'] {
    return newProxyChain<ChainApi>({ executor: new RuntimeApiExecutor(this) }) as ChainApi[RpcLegacy]['call'];
  }

  callAt(blockHash: HashOrSource): ChainApi[RpcLegacy]['call'] {
    return newProxyChain<ChainApi>({
      executor: new RuntimeApiExecutor(this, blockHash),
    }) as ChainApi[RpcLegacy]['call'];
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
    return newProxyChain<ChainApi>({ executor: new TxExecutor(this) }) as ChainApi[RpcLegacy]['tx'];
  }
}
