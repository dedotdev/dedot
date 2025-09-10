import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { TypinkRegistry } from './TypinkRegistry.js';
import { ConstructorTxExecutor, ConstructorQueryExecutor } from './executor/index.js';
import { ContractMetadata, ExecutionOptions, GenericContractApi, LooseContractMetadata } from './types/index.js';
import {
  ensurePalletPresence,
  ensureSupportedContractMetadataVersion,
  ensureValidCodeHashOrCode,
  newProxyChain,
} from './utils/index.js';

export class ContractDeployer<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #metadata: ContractMetadata;
  readonly #registry: TypinkRegistry;
  readonly #code: Hash | Uint8Array | string;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: LooseContractMetadata | string,
    codeHashOrCode: Hash | Uint8Array | string,
    options?: ExecutionOptions,
  ) {
    this.#metadata = (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) as ContractMetadata;

    ensureSupportedContractMetadataVersion(this.metadata);

    this.#registry = new TypinkRegistry(this.metadata);

    ensurePalletPresence(client, this.registry);
    ensureValidCodeHashOrCode(codeHashOrCode, this.registry);

    this.#code = codeHashOrCode;
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
