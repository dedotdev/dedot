import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { SolRegistry } from './SolRegistry.js';
import { TypinkRegistry } from './TypinkRegistry.js';
import {
  ConstructorQueryExecutor,
  ConstructorTxExecutor,
  SolConstructorQueryExecutor,
  SolConstructorTxExecutor,
} from './executor/index.js';
import {
  AB,
  ContractMetadata,
  ExecutionOptions,
  GenericContractApi,
  LooseContractMetadata,
  SolAbi,
} from './types/index.js';
import {
  ensurePalletPresence,
  ensureSupportedContractMetadataVersion,
  ensureValidCodeHashOrCode,
  isInkAbi,
  newProxyChain,
} from './utils/index.js';

export class ContractDeployer<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #isInk: boolean = false;
  readonly #metadata: AB<ContractApi['metadataType'], ContractMetadata, SolAbi>;
  readonly #registry: AB<ContractApi['metadataType'], TypinkRegistry, SolRegistry>;
  readonly #code: Hash | Uint8Array | string;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: AB<ContractApi['metadataType'], LooseContractMetadata, SolAbi> | string,
    codeHashOrCode: Hash | Uint8Array | string,
    options?: ExecutionOptions,
  ) {
    this.#metadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

    if (isInkAbi(this.metadata)) {
      this.#isInk = true;

      ensureSupportedContractMetadataVersion(this.metadata as ContractMetadata);
      // @ts-ignore
      this.#registry = new TypinkRegistry(this.metadata as ContractMetadata);

      ensurePalletPresence(client, (this.registry as TypinkRegistry).isRevive());
      ensureValidCodeHashOrCode(codeHashOrCode, (this.registry as TypinkRegistry).isRevive());
    } else {
      // @ts-ignore
      this.#registry = new SolRegistry(this.metadata as SolAbi);

      ensurePalletPresence(client, true);
      ensureValidCodeHashOrCode(codeHashOrCode, true);
    }

    this.#code = codeHashOrCode;
    this.#options = options;
  }

  get metadata(): AB<ContractApi['metadataType'], ContractMetadata, SolAbi> {
    return this.#metadata;
  }

  get registry(): AB<ContractApi['metadataType'], TypinkRegistry, SolRegistry> {
    return this.#registry;
  }

  get tx(): ContractApi['constructorTx'] {
    const Executor = this.#isInk ? ConstructorTxExecutor : SolConstructorTxExecutor;
    return newProxyChain(
      // @ts-ignore
      new Executor(this.client, this.registry, this.#code, this.options),
    ) as ContractApi['constructorTx'];
  }

  get query(): ContractApi['constructorQuery'] {
    const Executor = this.#isInk ? ConstructorQueryExecutor : SolConstructorQueryExecutor;
    return newProxyChain(
      // @ts-ignore
      new Executor(this.client, this.registry, this.#code, this.options),
    ) as ContractApi['constructorQuery'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }
}
