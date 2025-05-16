import { ISubstrateClient } from '@dedot/api';
import { AccountId20, AccountId20Like } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { TypinkRegistry } from '../../TypinkRegistry.js';
import { ContractCallMessage, ExecutionOptions } from '../../types/index.js';
import { normalizeLabel } from '../../utils.js';
import { Executor } from './Executor.js';

export abstract class ContractExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  readonly address: AccountId20;

  constructor(
    client: ISubstrateClient<ChainApi>,
    registry: TypinkRegistry,
    address: AccountId20Like,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    this.address = new AccountId20(address);
  }

  protected findMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => normalizeLabel(one.label) === message);
  }

  protected findTxMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => one.mutates && normalizeLabel(one.label) === message);
  }
}
