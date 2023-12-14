import { WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { CodecRegistry, Metadata, MetadataLatest } from '@delightfuldot/codecs';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { ConstantExecutor, ErrorExecutor, RpcExecutor, StorageQueryExecutor, EventExecutor } from './executor';
import { newProxyChain } from './proxychain';

interface ApiOptions {
  provider: ProviderInterface;
}

export default class DelightfulApi<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #provider: ProviderInterface;
  readonly #registry: CodecRegistry;
  #metadata?: Metadata;
  #metadataLatest?: MetadataLatest;

  protected constructor(options: ApiOptions) {
    this.#provider = options.provider;
    this.#registry = new CodecRegistry();
  }

  async init() {
    const metadata = await this.rpc.state.getMetadata();
    this.setMetadata(metadata);
  }

  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions,
  ): Promise<DelightfulApi<ChainApi>> {
    const api = new DelightfulApi<ChainApi>(options);

    if (api.provider instanceof WsProvider) {
      await api.provider.isReady;
    }

    await api.init();

    return api;
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

  get metadata() {
    // TODO assert metadata!
    return this.#metadata!;
  }

  get metadataLatest(): MetadataLatest {
    // TODO assert metadata!
    return this.#metadataLatest!;
  }

  setMetadata(metadata: Metadata) {
    this.#metadata = metadata;
    this.#metadataLatest = metadata.latest;
    this.registry.setMetadata(this.#metadataLatest);
  }

  async disconnect() {
    await this.#provider.disconnect();
  }
}
