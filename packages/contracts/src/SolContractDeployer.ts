import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, isPvm, toU8a } from '@dedot/utils';
import { Interface } from '@ethersproject/abi';
import { SolRegistry } from './SolRegistry';
import { SolConstructorTxExecutor, SolExecutor, SolConstructorQueryExecutor } from './executor/index.js';
import { ExecutionOptions, GenericContractApi, SolABIItem } from './types/index.js';
import { ensurePalletRevive } from './utils';

export class SolContractDeployer<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #abiItems: SolABIItem[];
  readonly #registry: SolRegistry;
  readonly #code: Hash | Uint8Array | string;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    abiItems: SolABIItem[] | string,
    codeHashOrCode: Hash | Uint8Array | string,
    options?: ExecutionOptions,
  ) {
    this.#abiItems = typeof abiItems === 'string' ? JSON.parse(abiItems) : abiItems;
    this.#registry = new SolRegistry(new Interface(this.#abiItems));

    ensurePalletRevive(client);
    assert(
      toU8a(codeHashOrCode).length === 32 || isPvm(codeHashOrCode),
      'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
    );

    this.#code = codeHashOrCode;
    this.#options = options;
  }

  get abiItems(): SolABIItem[] {
    return this.#abiItems;
  }

  get registry(): SolRegistry {
    return this.#registry;
  }

  get tx(): ContractApi['constructorTx'] {
    return newProxyChain(
      new SolConstructorTxExecutor(this.client, this.#registry, this.#code, this.#options),
    ) as ContractApi['constructorTx'];
  }

  get query(): ContractApi['constructorQuery'] {
    return newProxyChain(
      new SolConstructorQueryExecutor(this.client, this.#registry, this.#code, this.#options),
    ) as ContractApi['constructorQuery'];
  }

  get options(): ExecutionOptions | undefined {
    return this.#options;
  }
}

function newProxyChain<ChainApi extends GenericSubstrateApi>(carrier: SolExecutor<ChainApi>): unknown {
  return new Proxy(carrier, {
    get(target: SolExecutor<ChainApi>, property: string | symbol): any {
      return target.doExecute(property.toString());
    },
  });
}
