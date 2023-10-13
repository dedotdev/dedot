import { WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { CodecRegistry, Metadata, MetadataLatest } from '@delightfuldot/codecs';
import { ConstantExecutor, RpcExecutor } from './executor';
import { newProxyChain } from './proxychain';
import { ChainConsts, RpcCalls } from './types';

interface ApiOptions {
  provider: ProviderInterface;
}

export default class DelightfulApi {
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

  static async create(options: ApiOptions): Promise<DelightfulApi> {
    const api = new DelightfulApi(options);

    if (api.provider instanceof WsProvider) {
      await api.provider.isReady;
    }

    await api.init();

    return api;
  }

  get rpc(): RpcCalls {
    return newProxyChain({ executor: new RpcExecutor(this) }) as RpcCalls;
  }

  get consts(): ChainConsts {
    return newProxyChain({ executor: new ConstantExecutor(this) }) as ChainConsts;
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
