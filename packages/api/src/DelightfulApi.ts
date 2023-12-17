import { HttpProvider, WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { CodecRegistry, Metadata, MetadataLatest } from '@delightfuldot/codecs';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { ConstantExecutor, ErrorExecutor, RpcExecutor, StorageQueryExecutor, EventExecutor } from './executor';
import { newProxyChain } from './proxychain';
import { ApiOptions, NetworkEndpoint } from './types';
import { ensurePresence } from '@delightfuldot/utils';

export default class DelightfulApi<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #provider: ProviderInterface;
  readonly #registry: CodecRegistry;
  readonly #options: ApiOptions;
  #metadata?: Metadata;
  #metadataLatest?: MetadataLatest;

  protected constructor(options: ApiOptions | NetworkEndpoint) {
    this.#options = this.#normalizeOptions(options);
    this.#provider = this.#getProvider();
    this.#registry = new CodecRegistry();
  }

  #normalizeOptions(options: ApiOptions | NetworkEndpoint): ApiOptions {
    if (typeof options === 'string') {
      return { endpoint: options };
    } else {
      return options;
    }
  }

  #getProvider(): ProviderInterface {
    const { provider, endpoint } = this.#options;
    if (provider) return provider;

    if (endpoint) {
      if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
        return new WsProvider(endpoint);
      } else if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return new HttpProvider(endpoint);
      }
    }

    // TODO validate endpoint url
    // TODO support light-client

    return new WsProvider();
  }

  async init() {
    const metadata = await this.rpc.state.getMetadata();
    this.setMetadata(metadata);
  }

  static async create<ChainApi extends GenericSubstrateApi = SubstrateApi>(
    options: ApiOptions | NetworkEndpoint,
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

  get hasMetadata(): boolean {
    return !!this.#metadata && !!this.#metadataLatest;
  }

  get metadata(): Metadata {
    return ensurePresence(this.#metadata);
  }

  get metadataLatest(): MetadataLatest {
    return ensurePresence(this.#metadataLatest);
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
