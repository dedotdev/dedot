import { ISubstrateClient } from '@dedot/api';
import { AccountId32, AccountId32Like } from '@dedot/codecs';
import { IEventRecord } from '@dedot/types';
import { TypinkRegistry } from './TypinkRegistry.js';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/index.js';
import { ContractEvent, ContractMetadata, GenericContractApi, ExecutionOptions } from './types/index.js';
import { ensureSupportContractsPallet, newProxyChain, parseRawMetadata } from './utils.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: TypinkRegistry;
  readonly #address: AccountId32;
  readonly #metadata: ContractMetadata;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: ContractMetadata | string,
    address: AccountId32Like,
    options?: ExecutionOptions,
  ) {
    ensureSupportContractsPallet(client);

    this.#address = new AccountId32(address);
    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;
    this.#registry = new TypinkRegistry(this.#metadata);
    this.#options = options;
  }

  decodeEvent(eventRecord: IEventRecord): ContractEvent {
    return this.#registry.decodeEvent(eventRecord, this.address);
  }

  decodeEvents(eventRecords: IEventRecord[]): ContractEvent[] {
    return this.#registry.decodeEvents(eventRecords, this.address);
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
    return newProxyChain(
      new QueryExecutor(this.client, this.#registry, this.#address, this.#options),
    ) as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    return newProxyChain(
      new TxExecutor(this.client, this.#registry, this.#address, this.#options),
    ) as ContractApi['tx'];
  }

  get events(): ContractApi['events'] {
    return newProxyChain(
      new EventExecutor(this.client, this.#registry, this.#address, this.#options),
    ) as ContractApi['events'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }
}
