import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { assert, isPvm, toU8a } from '@dedot/utils';
import { Interface } from '@ethersproject/abi';
import { SolRegistry } from './SolRegistry';
import { TypinkRegistry } from './TypinkRegistry.js';
import {
  ConstructorTxExecutor,
  ConstructorQueryExecutor,
  SolConstructorQueryExecutor,
  SolConstructorTxExecutor,
} from './executor/index.js';
import {
  ContractMetadata,
  ExecutionOptions,
  GenericContractApi,
  LooseContractMetadata,
  SolABI,
} from './types/index.js';
import {
  ensurePalletPresence,
  ensurePalletRevive,
  ensureSupportedContractMetadataVersion,
  ensureValidCodeHashOrCode,
  newProxyChain,
} from './utils/index.js';

export class ContractDeployer<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #isInk: boolean = false;
  readonly #metadata: ContractApi['types']['Metadata'];
  readonly #registry: ContractApi['types']['Registry'];
  readonly #code: Hash | Uint8Array | string;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    metadata: LooseContractMetadata | SolABI | string,
    codeHashOrCode: Hash | Uint8Array | string,
    options?: ExecutionOptions,
  ) {
    this.#metadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    this.#isInk = !Array.isArray(metadata);

    if (!this.#isInk) {
      ensureSupportedContractMetadataVersion(this.metadata as ContractMetadata);

      this.#registry = new TypinkRegistry(this.metadata as ContractMetadata);

      ensurePalletPresence(client, this.registry as TypinkRegistry);
      ensureValidCodeHashOrCode(codeHashOrCode, this.registry as TypinkRegistry);
    } else {
      this.#registry = new SolRegistry(new Interface(this.#metadata as SolABI));

      ensurePalletRevive(client);
      assert(
        toU8a(codeHashOrCode).length === 32 || isPvm(codeHashOrCode),
        'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
      );
    }

    this.#code = codeHashOrCode;
    this.#options = options;
  }

  get metadata(): ContractApi['types']['Metadata'] {
    return this.#metadata;
  }

  get registry(): ContractApi['types']['Registry'] {
    return this.#registry;
  }

  get tx(): ContractApi['constructorTx'] {
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new SolConstructorTxExecutor(this.client, this.#registry as SolRegistry, this.#code, this.#options)
        : new ConstructorTxExecutor(this.client, this.#registry as TypinkRegistry, this.#code, this.#options),
    ) as ContractApi['constructorTx'];
  }

  get query(): ContractApi['constructorQuery'] {
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new SolConstructorQueryExecutor(this.client, this.#registry as SolRegistry, this.#code, this.#options)
        : new ConstructorQueryExecutor(this.client, this.#registry as TypinkRegistry, this.#code, this.#options),
    ) as ContractApi['constructorQuery'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }
}
