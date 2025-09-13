import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, HexString, isEvmAddress } from '@dedot/utils';
import { Interface } from '@ethersproject/abi';
import { SolQueryExecutor, SolExecutor, SolTxExecutor, SolEventExecutor } from './executor/index.js';
import { ContractAddress, ExecutionOptions, SolABIItem, SolGenericContractApi } from './types/index.js';
import { ensurePalletRevive } from './utils';

export class SolContract<ContractApi extends SolGenericContractApi = SolGenericContractApi> {
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

    ensurePalletRevive(client);
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

  get events(): ContractApi['events'] {
    return newProxyChain(
      new SolEventExecutor(this.client, this.#interf, this.#address, this.#options),
    ) as ContractApi['events'];
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
