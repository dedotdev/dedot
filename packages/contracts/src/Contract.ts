import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32, AccountId32Like } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { TypinkRegistry } from './TypinkRegistry.js';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/index.js';
import { ContractMetadata, GenericContractApi } from './types/index.js';
import { ensureSupportContractsPallet, newProxyChain, parseRawMetadata } from './utils.js';
import { FrameSystemEventRecord } from '@dedot/api/chaintypes/index.js';

export class Contract<
  ContractApi extends GenericContractApi = GenericContractApi,
  ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion],
> {
  readonly #api: ISubstrateClient<ChainApi>;
  readonly #registry: TypinkRegistry;
  readonly #address: AccountId32;
  readonly #metadata: ContractMetadata;

  constructor(api: ISubstrateClient<ChainApi>, address: AccountId32Like, metadata: ContractMetadata | string) {
    ensureSupportContractsPallet(api);

    this.#api = api;
    this.#address = new AccountId32(address);
    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;
    this.#registry = new TypinkRegistry(this.#metadata);
  }

  decodeEvent(eventRecord: FrameSystemEventRecord) {
      return this.#registry.decodeEvent(eventRecord);
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  get address(): AccountId32 {
    return this.#address;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  get query(): ContractApi['query'] {
    return newProxyChain<ChainApi>(new QueryExecutor(this.#api, this.#registry, this.#address)) as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    return newProxyChain<ChainApi>(new TxExecutor(this.#api, this.#registry, this.#address)) as ContractApi['tx'];
  }

  get events(): ContractApi['events'] {
    return newProxyChain<ChainApi>(new EventExecutor(this.#api, this.#registry, this.#address)) as ContractApi['events'];
  }
}
