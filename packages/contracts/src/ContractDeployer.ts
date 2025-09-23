import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { assert, isPvm, toU8a } from '@dedot/utils';
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
  ensurePalletRevive,
  ensureSupportedContractMetadataVersion,
  ensureValidCodeHashOrCode,
  isInkMetadata,
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
    this.#isInk = isInkMetadata(this.#metadata);

    if (this.#isInk) {
      ensureSupportedContractMetadataVersion(this.metadata as ContractMetadata);
      // @ts-ignore
      this.#registry = new TypinkRegistry(this.metadata as ContractMetadata);

      ensurePalletPresence(client, this.registry as TypinkRegistry);
      ensureValidCodeHashOrCode(codeHashOrCode, this.registry as TypinkRegistry);
    } else {
      // @ts-ignore
      this.#registry = new SolRegistry(this.metadata as SolAbi);

      ensurePalletRevive(client);
      assert(
        toU8a(codeHashOrCode).length === 32 || isPvm(codeHashOrCode),
        'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
      );
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
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new ConstructorTxExecutor(this.client, this.#registry as TypinkRegistry, this.#code, this.#options)
        : new SolConstructorTxExecutor(this.client, this.#registry as SolRegistry, this.#code, this.#options),
    ) as ContractApi['constructorTx'];
  }

  get query(): ContractApi['constructorQuery'] {
    return newProxyChain(
      // @ts-ignore
      this.#isInk
        ? new ConstructorQueryExecutor(this.client, this.#registry as TypinkRegistry, this.#code, this.#options)
        : new SolConstructorQueryExecutor(this.client, this.#registry as SolRegistry, this.#code, this.#options),
    ) as ContractApi['constructorQuery'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }
}
