import { ISubstrateClient } from '@dedot/api';
import { GenericSubstrateApi } from '@dedot/types';
import { TypinkRegistry } from '../../../TypinkRegistry.js';
import { ContractAddress, ContractCallMessage, ExecutionOptions } from '../../../types/index.js';
import { normalizeLabel } from '../../../utils/index.js';
import { Executor } from './Executor.js';

export abstract class ContractExecutor extends Executor {
  readonly address: ContractAddress;

  constructor(
    client: ISubstrateClient,
    registry: TypinkRegistry,
    address: ContractAddress,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    this.address = address;
  }

  protected findMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => normalizeLabel(one.label) === message);
  }

  protected findTxMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => one.mutates && normalizeLabel(one.label) === message);
  }
}
