import { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32, AccountId32Like } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { ensurePresence, HexString } from '@dedot/utils';
import { TypinkRegistry } from '../../TypinkRegistry.js';
import { ContractAddress, ContractCallMessage, ExecutionOptions } from '../../types/index.js';
import { normalizeLabel } from '../../utils.js';
import { Executor } from './Executor.js';

export abstract class ContractExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  readonly address: ContractAddress;

  constructor(
    client: ISubstrateClient<ChainApi>,
    registry: TypinkRegistry,
    address: ContractAddress,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    // TODO validate address depends on ink version
    this.address = address;
  }

  async ensureContractPresence() {
    const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;
    let contractInfo: any;
    if (this.registry.isInkV6()) {
      contractInfo = await client.query.revive.contractInfoOf(this.address as HexString);
    } else {
      contractInfo = await client.query.contracts.contractInfoOf(this.address);
    }

    ensurePresence(contractInfo, `Contract with address ${this.address} does not exist on chain!`);
  }

  protected findMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => normalizeLabel(one.label) === message);
  }

  protected findTxMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => one.mutates && normalizeLabel(one.label) === message);
  }
}
