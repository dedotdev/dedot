import { WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { Metadata, MetadataLatest } from '@delightfuldot/codecs';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { ConstantExecutor, RpcExecutor } from './executor';
import { newProxyChain } from './proxychain';
import { CodecRegistry } from "./registry";

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

  static async create<ChainType extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions,
  ): Promise<DelightfulApi<ChainType>> {
    const api = new DelightfulApi<ChainType>(options);

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

  get metadataLatest() {
    // TODO assert metadata!
    return this.#metadataLatest!;
  }

  setMetadata(metadata: Metadata) {
    this.#metadata = metadata;
    this.#metadataLatest = metadata.latest;
    this.registry.setMetadata(metadata);
  }

  async disconnect() {
    await this.#provider.disconnect();
  }
}
