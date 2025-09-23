import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { stringCamelCase } from '@dedot/utils';
import { SolRegistry } from '../../../SolRegistry';
import { ContractAddress, ExecutionOptions, SolAbiFunction } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';

export abstract class SolContractExecutor<ChainApi extends GenericSubstrateApi> extends SolExecutor<ChainApi> {
  readonly address: ContractAddress;

  constructor(
    client: ISubstrateClient<ChainApi>,
    registry: SolRegistry,
    address: ContractAddress,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    this.address = address;
  }

  protected findFragment(fragment: string): SolAbiFunction | undefined {
    return this.abi.find((one) => one.type === 'function' && stringCamelCase(one.name) === fragment) as SolAbiFunction;
  }

  protected findTxFragment(fragment: string): SolAbiFunction | undefined {
    const found = this.findFragment(fragment);

    if (found && found.stateMutability !== 'view') {
      return found;
    }

    return undefined;
  }
}
