import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { TypinkRegistry } from './TypinkRegistry.js';
import { ConstructorQueryExecutor } from './executor/ConstructorQueryExecutor.js';
import { ConstructorTxExecutor } from './executor/index.js';
import { ContractMetadata, GenericContractApi, ExecutionOptions, LooseContractMetadata } from './types/index.js';
import { ensureSupportContractsPallet, newProxyChain, parseRawMetadata } from './utils.js';

export class ContractDeployer<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #metadata: ContractMetadata;
  readonly #registry: TypinkRegistry;
  readonly #code: Hash | Uint8Array | string;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: LooseContractMetadata | string,
    codeHashOrWasm: Hash | Uint8Array | string,
    options?: ExecutionOptions,
  ) {
    ensureSupportContractsPallet(client);

    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : (metadata as ContractMetadata);
    this.#registry = new TypinkRegistry(this.#metadata);
    this.#code = codeHashOrWasm;
    this.#options = options;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  get tx(): ContractApi['constructorTx'] {
    return newProxyChain(
      new ConstructorTxExecutor(this.client, this.#registry, this.#code, this.#options),
    ) as ContractApi['constructorTx'];
  }

  get query(): ContractApi['constructorQuery'] {
    return newProxyChain(
      new ConstructorQueryExecutor(this.client, this.#registry, this.#code, this.#options),
    ) as ContractApi['constructorQuery'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }
}
