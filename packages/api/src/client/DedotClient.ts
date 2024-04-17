import type { SubstrateApi } from '../chaintypes/index.js';
import { BlockHash, Metadata } from '@dedot/codecs';
import { RpcV2, VersionedGenericSubstrateApi } from '@dedot/types';
import { RuntimeApiExecutorV2, StorageQueryExecutorV2, TxExecutorV2 } from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import type { ApiOptions, HashOrSource, NetworkEndpoint } from '../types.js';
import { HexString } from '@dedot/utils';
import { ChainHead, ChainSpec, Transaction } from '../json-rpc/index.js';
import { BaseSubstrateClient, ensurePresence } from './BaseSubstrateClient.js';
import { ChainHeadRuntimeVersion } from '@dedot/specs';

/**
 * @name DedotClient
 * @description New promised-based API Client for Polkadot & Substrate based on JSON-RPC V2
 * ```
 */
export class DedotClient<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends BaseSubstrateClient<ChainApi> {
  _chainHead?: ChainHead;
  _chainSpec?: ChainSpec;
  _txBroadcaster?: Transaction;

  /**
   * Use factory methods (`create`, `new`) to create `DedotClient` instances.
   *
   * @param options
   */
  constructor(options: ApiOptions | NetworkEndpoint) {
    super('v2', options);
  }

  /**
   * Factory method to create a new DedotClient instance
   *
   * @param options
   */
  static async create<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<DedotClient<ChainApi>> {
    return new DedotClient<ChainApi>(options).connect();
  }

  /**
   * Alias for __DedotClient.create__
   *
   * @param options
   */
  static async new<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
  ): Promise<DedotClient<ChainApi>> {
    return DedotClient.create(options);
  }

  get chainSpec() {
    return ensurePresence(this._chainSpec);
  }

  get chainHead() {
    return ensurePresence(this._chainHead);
  }

  get txBroadcaster() {
    return ensurePresence(this._txBroadcaster);
  }

  /**
   * Initialize APIs before usage
   */
  protected async doInitialize() {
    const rpcMethods = (await this.rpc.rpc_methods()).methods;

    this._chainSpec = new ChainSpec(this, { rpcMethods });
    this._chainHead = new ChainHead(this, { rpcMethods });
    this._txBroadcaster = new Transaction(this, { rpcMethods });

    // Fetching node information
    let [_, genesisHash, chainName, chainProps] = await Promise.all([
      this.chainHead.follow(true),
      this.chainSpec.genesisHash(),
      this.chainSpec.chainName(),
      this.chainSpec.properties(),
    ]);

    this._genesisHash = genesisHash as HexString;
    this._runtimeChain = chainName;
    this._runtimeVersion = this.chainHead.runtimeVersion;
    this._chainProperties = chainProps;

    let metadata: Metadata | undefined;
    if (await this.shouldLoadPreloadMetadata()) {
      metadata = await this.fetchMetadata();
    }

    await this.setupMetadata(metadata);
    this.subscribeRuntimeUpgrades();
  }

  protected subscribeRuntimeUpgrades() {
    if (this.hasCatchAllMetadata) return;

    this.chainHead.on('bestBlock', this.onRuntimeUpgrade);
  }

  protected unsubscribeRuntimeUpgrades() {
    if (this.hasCatchAllMetadata) return;

    this.chainHead.off('bestBlock', this.onRuntimeUpgrade);
  }

  protected onRuntimeUpgrade = async (_: BlockHash, newRuntime?: ChainHeadRuntimeVersion) => {
    if (newRuntime && newRuntime.specVersion !== this._runtimeVersion?.specVersion) {
      this._runtimeVersion = newRuntime;
      const newMetadata = await this.fetchMetadata();
      await this.setupMetadata(newMetadata);
    }
  };

  protected async beforeDisconnect(): Promise<void> {
    this.unsubscribeRuntimeUpgrades();
  }

  protected onDisconnected = async () => {
    this.unsubscribeRuntimeUpgrades();
  };

  protected cleanUp() {
    super.cleanUp();
    this._chainHead = undefined;
    this._chainSpec = undefined;
    this._txBroadcaster = undefined;
  }

  get query(): ChainApi[RpcV2]['query'] {
    return newProxyChain<ChainApi>({
      executor: new StorageQueryExecutorV2(this, this.chainHead),
    }) as ChainApi[RpcV2]['query'];
  }

  queryAt(blockHash: HashOrSource): ChainApi[RpcV2]['query'] {
    return newProxyChain<ChainApi>({
      executor: new StorageQueryExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi[RpcV2]['query'];
  }

  get call(): ChainApi[RpcV2]['call'] {
    return newProxyChain<ChainApi>({
      executor: new RuntimeApiExecutorV2(this, this.chainHead),
    }) as ChainApi[RpcV2]['call'];
  }

  callAt(blockHash: BlockHash): ChainApi[RpcV2]['call'] {
    return newProxyChain<ChainApi>({
      executor: new RuntimeApiExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi[RpcV2]['call'];
  }

  get tx(): ChainApi[RpcV2]['tx'] {
    return newProxyChain<ChainApi>({ executor: new TxExecutorV2(this) }) as ChainApi[RpcV2]['tx'];
  }
}
