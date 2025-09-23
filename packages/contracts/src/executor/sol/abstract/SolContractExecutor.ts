import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { SolRegistry } from '../../../SolRegistry';
import { ContractAddress, ExecutionOptions } from '../../../types/index.js';
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
}
