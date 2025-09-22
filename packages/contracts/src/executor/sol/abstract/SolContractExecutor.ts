import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { stringCamelCase } from '@dedot/utils';
import { ContractAddress, ExecutionOptions, SolABI, SolABIFunction } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';

export abstract class SolContractExecutor<ChainApi extends GenericSubstrateApi> extends SolExecutor<ChainApi> {
  readonly address: ContractAddress;

  constructor(client: ISubstrateClient<ChainApi>, abi: SolABI, address: ContractAddress, options?: ExecutionOptions) {
    super(client, abi, options);

    this.address = address;
  }

  protected findFragment(fragment: string): SolABIFunction | undefined {
    return this.abi.find((one) => one.type === 'function' && stringCamelCase(one.name) === fragment) as SolABIFunction;
  }

  protected findTxFragment(fragment: string): SolABIFunction | undefined {
    const found = this.findFragment(fragment);

    if (found && found.stateMutability !== 'view') {
      return found;
    }

    return undefined;
  }
}
