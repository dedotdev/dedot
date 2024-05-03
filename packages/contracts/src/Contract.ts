import { AccountId32 } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { Dedot, SubstrateApi } from 'dedot';
import { TypinkRegistry } from './TypinkRegistry.js';
import { QueryExecutor, TxExecutor, Executor } from './executor/index.js';
import { ContractMetadata, GenericContractApi } from './types/index.js';
import { parseRawMetadata } from './utils.js';

export class Contract<ContractApi extends GenericContractApi, ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #registry: TypinkRegistry;
  readonly #address: AccountId32;
  readonly #metadata: ContractMetadata;

  constructor(api: Dedot<ChainApi>, address: AccountId32 | string, metadata: ContractMetadata | string) {
    this.#api = api;
    this.#address = new AccountId32(address);
    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;
    this.#registry = new TypinkRegistry(this.#metadata);
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
    return newProxyChain<ChainApi>(new TxExecutor(this.#api, this.#registry, this.#address)) as ContractApi['query'];
  }
}

export function newProxyChain<ChainApi extends GenericSubstrateApi>(carrier: Executor<ChainApi>): unknown {
  return new Proxy(carrier, {
    get(target: Executor<ChainApi>, property: string | symbol): any {
      return target.doExecute(property.toString());
    },
  });
}
