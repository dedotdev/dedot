import { ISubstrateClient } from '@dedot/api';
import { AccountId32, AccountId32Like } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractCallMessage, Options } from '../types/index.js';
import { normalizeLabel } from '../utils.js';
import { Executor } from './Executor.js';

export abstract class ContractExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  readonly #address: AccountId32;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, address: AccountId32Like, options?: Options) {
    super(api, registry, options);
    this.#address = new AccountId32(address);
  }

  get address(): AccountId32 {
    return this.#address;
  }

  findMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => normalizeLabel(one.label) === message);
  }

  findTxMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => one.mutates && normalizeLabel(one.label) === message);
  }
}
