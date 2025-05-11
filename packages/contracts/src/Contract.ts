import { ISubstrateClient } from '@dedot/api';
import { AccountId20, AccountId20Like, AccountId32, AccountId32Like } from '@dedot/codecs';
import { IEventRecord } from '@dedot/types';
import { TypinkRegistry } from './TypinkRegistry.js';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/index.js';
import { ContractEvent, ContractMetadata, GenericContractApi, ExecutionOptions } from './types/index.js';
import { ensureSupportContractsPallet, newProxyChain, palletReviveCompatible, parseRawMetadata } from './utils.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: TypinkRegistry;
  readonly #address: AccountId32 | AccountId20;
  readonly #metadata: ContractMetadata;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: ContractMetadata | string,
    address: AccountId32Like | AccountId20Like,
    options?: ExecutionOptions,
  ) {
    ensureSupportContractsPallet(client);

    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;

    if (palletReviveCompatible(this.#metadata)) {
      this.#address = new AccountId20(address as AccountId20Like);
    } else {
      this.#address = new AccountId32(address as AccountId32Like);
    }
    this.#registry = new TypinkRegistry(this.#metadata);
    this.#options = options;
  }

  decodeEvent(eventRecord: IEventRecord): ContractEvent {
    // @ts-ignore
    return this.#registry.decodeEvent(eventRecord, this.address);
  }

  decodeEvents(eventRecords: IEventRecord[]): ContractEvent[] {
    // @ts-ignore
    return this.#registry.decodeEvents(eventRecords, this.address);
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  get address(): AccountId32 | AccountId20 {
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
