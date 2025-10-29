import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { SolRegistry } from '../../../SolRegistry.js';
import { ContractAddress, ExecutionOptions } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';

export abstract class SolContractExecutor extends SolExecutor {
  readonly address: ContractAddress;

  constructor(client: ISubstrateClient, registry: SolRegistry, address: ContractAddress, options?: ExecutionOptions) {
    super(client, registry, options);

    this.address = address;
  }
}
