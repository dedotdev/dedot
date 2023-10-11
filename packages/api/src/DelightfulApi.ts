import { WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { CodecRegistry, Metadata } from '@delightfuldot/types';
import { ConstantExecutor, RpcExecutor } from './executor';
import { newProxyChain } from './proxychain';

interface ApiOptions {
  provider: ProviderInterface;
}

export default class DelightfulApi {
  #provider: ProviderInterface;
  #registry: CodecRegistry;
  #metadata?: Metadata;

  protected constructor(options: ApiOptions) {
    this.#provider = options.provider;
    this.#registry = new CodecRegistry();
  }

  async init() {
    const metadata: Metadata = await this.rpc.state.getMetadata();

    this.#metadata = metadata;
    this.registry.setMetadata(metadata);
  }

  static async create(options: ApiOptions): Promise<DelightfulApi> {
    const api = new DelightfulApi(options);

    if (api.provider instanceof WsProvider) {
      await api.provider.isReady;
    }

    await api.init();

    return api;
  }

  get rpc(): any {
    return newProxyChain({ executor: new RpcExecutor(this) });
  }

  get consts(): any {
    return newProxyChain({ executor: new ConstantExecutor(this) });
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

  async disconnect() {
    await this.#provider.disconnect();
  }
}
