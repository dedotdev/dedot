import { ISubstrateClient } from '@dedot/api';
import { AccountId32 } from '@dedot/codecs';
import { IEventRecord } from '@dedot/types';
import { TypinkRegistry } from './TypinkRegistry.js';
import { EventExecutor, QueryExecutor, TxExecutor } from './executor/index.js';
import {
  ContractEvent,
  ContractMetadata,
  GenericContractApi,
  ExecutionOptions,
  ContractAddress,
  LooseContractMetadata,
} from './types/index.js';
import { ensureSupportPalletContracts, ensureSupportPalletRevive, newProxyChain, parseRawMetadata } from './utils.js';

export class Contract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #registry: TypinkRegistry;
  readonly #address: ContractAddress;
  readonly #metadata: ContractMetadata;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: LooseContractMetadata | string,
    address: ContractAddress,
    options?: ExecutionOptions,
  ) {
    // TODO validate address depends on ink version
    this.#address = address;

    this.#metadata =
      typeof metadata === 'string' // --
        ? parseRawMetadata(metadata)
        : (metadata as ContractMetadata);

    this.#registry = new TypinkRegistry(this.#metadata);

    if (this.registry.isInkV6()) {
      ensureSupportPalletRevive(client);
    } else {
      ensureSupportPalletContracts(client);
    }

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

  get address(): ContractAddress {
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
