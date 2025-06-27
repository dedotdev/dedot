import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, DedotError, HexString, isEvmAddress } from '@dedot/utils';
import { Interface } from '@ethersproject/abi';
import { SolExecutor } from './executor/abstract/sol/SolExecutor.js';
import { SolQueryExecutor } from './executor/sol/SolQueryExecutor.js';
import { SolTxExecutor } from './executor/sol/SolTxExecutor.js';
import { ContractAddress, ExecutionOptions, GenericContractApi, SolABIItem } from './types/index.js';

export class SolContract<ContractApi extends GenericContractApi = GenericContractApi> {
  readonly #address: ContractAddress;
  readonly #abiItems: SolABIItem[];
  readonly #interf: Interface;
  readonly #options?: ExecutionOptions;

  constructor(
    readonly client: ISubstrateClient<ContractApi['types']['ChainApi']>,
    abiItems: SolABIItem[] | string,
    address: ContractAddress,
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
      isEvmAddress(address as HexString),
      `Invalid contract address: ${address}. Expected an EVM 20-byte address as a hex string or a Uint8Array`,
    );

    this.#address = address;
    this.#options = options;
  }

  get abiItems(): SolABIItem[] {
    return this.#abiItems;
  }

  get address(): ContractAddress {
    return this.#address;
  }

  get interf(): Interface {
    return this.#interf;
  }

  get query(): ContractApi['query'] {
    return newProxyChain(
      new SolQueryExecutor(this.client, this.#interf, this.#address, this.#options),
    ) as ContractApi['query'];
  }

  get tx(): ContractApi['tx'] {
    return newProxyChain(
      new SolTxExecutor(this.client, this.#interf, this.#address, this.#options),
    ) as ContractApi['tx'];
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
