import { GenericSubstrateApi } from '@dedot/types';
import { ISubstrateClient, Hash } from 'dedot';
import { TypinkRegistry } from './TypinkRegistry.js';
import { ConstructorExecutor } from './executor/index.js';
import { ContractMetadata, GenericContractApi } from './types/index.js';
import { newProxyChain, ensureSupportContractsPallet } from './utils.js';
import { parseRawMetadata } from './utils.js';

export class ContractDeployer<ContractApi extends GenericContractApi, ChainApi extends GenericSubstrateApi> {
  readonly #api: ISubstrateClient<ChainApi>;
  readonly #metadata: ContractMetadata;
  readonly #registry: TypinkRegistry;
  readonly #code: Hash | Uint8Array | string;

  constructor(
    api: ISubstrateClient<ChainApi>,
    metadata: ContractMetadata | string,
    codeHashOrWasm: Hash | Uint8Array | string,
  ) {
    ensureSupportContractsPallet(api);

    this.#api = api;
    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;
    this.#registry = new TypinkRegistry(this.#metadata);
    this.#code = codeHashOrWasm;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  get tx(): ContractApi['constructor'] {
    return newProxyChain<ChainApi>(
      new ConstructorExecutor<ChainApi>(this.#api, this.#registry, this.#code),
    ) as ContractApi['constructor'];
  }
}
