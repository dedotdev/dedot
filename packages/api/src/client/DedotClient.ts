import type { SubstrateApi } from '../chaintypes/index.js';
import { $H256, BlockHash, Metadata } from '@dedot/codecs';
import { RpcV2, VersionedGenericSubstrateApi } from '@dedot/types';
import { RuntimeApiExecutorV2, StorageQueryExecutorV2, TxExecutorV2 } from '../executor/index.js';
import { newProxyChain } from '../proxychain.js';
import type { ApiOptions, HashOrSource, NetworkEndpoint, TxBroadcaster } from '../types.js';
import { assert, concatU8a, HexString, twox64Concat, u8aToHex, xxhashAsU8a } from '@dedot/utils';
import { ChainHead, ChainSpec, Transaction, TransactionWatch } from '../json-rpc/index.js';
import { BaseSubstrateClient, ensurePresence } from './BaseSubstrateClient.js';
import { ChainHeadRuntimeVersion } from '@dedot/specs';
import { u32 } from '@dedot/shape';

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
  _txBroadcaster?: TxBroadcaster;

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
    this.chainHead; // Ensure chain head is initialized
    assert(this._txBroadcaster, 'JSON-RPC method to broadcast transactions is not supported by server/node.');
    return this._txBroadcaster;
  }

  async #initializeTxBroadcaster(rpcMethods: string[]): Promise<TxBroadcaster | undefined> {
    const tx = new Transaction(this, { rpcMethods });
    if (await tx.supported()) return tx;

    const txWatch = new TransactionWatch(this, { rpcMethods });
    if (await txWatch.supported()) return txWatch;
  }

  /**
   * Initialize APIs before usage
   */
  protected override async doInitialize() {
    const rpcMethods: string[] = (await this.rpc.rpc_methods()).methods;

    this._chainHead = new ChainHead(this, { rpcMethods });
    this._chainSpec = new ChainSpec(this, { rpcMethods });
    this._txBroadcaster = await this.#initializeTxBroadcaster(rpcMethods);

    // Fetching node information
    let [_, genesisHash] = await Promise.all([
      this.chainHead.follow(true),
      this.chainSpec.genesisHash().catch(() => undefined),
    ]);

    this._genesisHash = genesisHash || (await this.#getGenesisHashFallback());
    this._runtimeVersion = this.chainHead.runtimeVersion;

    let metadata;
    if (await this.shouldLoadPreloadMetadata()) {
      metadata = await this.fetchMetadata();
    }

    await this.setupMetadata(metadata);
    this.subscribeRuntimeUpgrades();
  }

  async #getGenesisHashFallback(): Promise<HexString> {
    const pallet = xxhashAsU8a('System', 128);
    const item = xxhashAsU8a('BlockHash', 128);
    const zeroBlockHeight = twox64Concat(u32.encode(0));

    const key = u8aToHex(concatU8a(pallet, item, zeroBlockHeight));

    const storageValue = await this.chainHead.storage([{ type: 'value', key }]);
    return $H256.tryDecode(storageValue[0].value);
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

  protected override async beforeDisconnect(): Promise<void> {
    this.unsubscribeRuntimeUpgrades();
  }

  protected override onDisconnected = async () => {
    this.unsubscribeRuntimeUpgrades();
  };

  protected override cleanUp() {
    super.cleanUp();
    this._chainHead = undefined;
    this._chainSpec = undefined;
    this._txBroadcaster = undefined;
  }

  override get query(): ChainApi[RpcV2]['query'] {
    return newProxyChain<ChainApi>({
      executor: new StorageQueryExecutorV2(this, this.chainHead),
    }) as ChainApi[RpcV2]['query'];
  }

  override queryAt(blockHash: HashOrSource): ChainApi[RpcV2]['query'] {
    return newProxyChain<ChainApi>({
      executor: new StorageQueryExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi[RpcV2]['query'];
  }

  override get call(): ChainApi[RpcV2]['call'] {
    return newProxyChain<ChainApi>({
      executor: new RuntimeApiExecutorV2(this, this.chainHead),
    }) as ChainApi[RpcV2]['call'];
  }

  override callAt(blockHash: BlockHash): ChainApi[RpcV2]['call'] {
    return newProxyChain<ChainApi>({
      executor: new RuntimeApiExecutorV2(this, this.chainHead, blockHash),
    }) as ChainApi[RpcV2]['call'];
  }

  override get tx(): ChainApi[RpcV2]['tx'] {
    return newProxyChain<ChainApi>({ executor: new TxExecutorV2(this) }) as ChainApi[RpcV2]['tx'];
  }
}
