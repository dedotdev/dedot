import { ISubstrateClient } from '@dedot/api';
import { AccountId20, AccountId20Like, AccountId32, AccountId32Like } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { TypinkRegistry } from '../../TypinkRegistry.js';
import { ContractCallMessage, ExecutionOptions } from '../../types/index.js';
import { normalizeLabel } from '../../utils.js';
import { Executor } from './Executor.js';

export abstract class ContractExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  readonly address: AccountId32 | AccountId20;

  constructor(
    client: ISubstrateClient<ChainApi>,
    registry: TypinkRegistry,
    address: AccountId32Like | AccountId20Like,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    if (this.palletReviveCompatible) {
      this.address = new AccountId20(address as AccountId20Like);
    } else {
      this.address = new AccountId32(address as AccountId32Like);
    }
  }

  protected findMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => normalizeLabel(one.label) === message);
  }

  protected findTxMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => one.mutates && normalizeLabel(one.label) === message);
  }
}
