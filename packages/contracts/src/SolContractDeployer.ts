import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, DedotError, isPvm, toU8a } from '@dedot/utils';
import { Interface } from '@ethersproject/abi';
import { SolExecutor } from './executor/abstract/sol/SolExecutor.js';
import { SolConstructorQueryExecutor } from './executor/sol/SolConstructorQueryExecutor.js';
import { SolConstructorTxExecutor } from './executor/sol/SolConstructorTxExecutor.js';
import { ExecutionOptions, GenericContractApi, SolABIItem } from './types/index.js';

export class SolContractDeployer<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #abiItems: SolABIItem[];
  readonly #interf: Interface;
  readonly #code: Hash | Uint8Array | string;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    abiItems: SolABIItem[] | string,
    codeHashOrCode: Hash | Uint8Array | string,
    options?: ExecutionOptions,
  ) {
    this.#abiItems = typeof abiItems === 'string' ? JSON.parse(abiItems) : abiItems;
    this.#interf = new Interface(this.#abiItems);

    try {
      !!client.call.reviveApi.call.meta && !!client.tx.revive.call.meta;
    } catch {
      throw new DedotError('Pallet Revive is not available');
    }

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

  get interf(): Interface {
    return this.#interf;
  }

  get tx(): ContractApi['constructorTx'] {
    return newProxyChain(
      new SolConstructorTxExecutor(this.client, this.#interf, this.#code, this.#options),
    ) as ContractApi['constructorTx'];
  }

  get query(): ContractApi['constructorQuery'] {
    return newProxyChain(
      new SolConstructorQueryExecutor(this.client, this.#interf, this.#code, this.#options),
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
