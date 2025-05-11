import { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32, AccountId32Like, H160 } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, concatU8a, hexToU8a, u8aToHex } from '@dedot/utils';
import { ContractTxOptions, GenericContractTxCall } from '../types/index.js';
import { ContractExecutor } from './abstract/index.js';

export class TxExecutor<ChainApi extends GenericSubstrateApi> extends ContractExecutor<ChainApi> {
  doExecute(message: string) {
    const meta = this.findTxMessage(message);
    assert(meta, `Tx message not found: ${message}`);

    // @ts-ignore TODO check types
    const callFn: GenericContractTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ContractTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ContractTxOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      if (this.palletReviveCompatible) {
        return client.tx.revive.call(
          this.address.address() as unknown as H160,
          value,
          gasLimit,
          storageDepositLimit || 0n, // TODO check this requirement
          bytes,
        );
      } else {
        return client.tx.contracts.call(
          this.address as AccountId32, // prettier-end-her
          value,
          gasLimit,
          storageDepositLimit,
          bytes,
        );
      }
    };

    callFn.meta = meta;

    return callFn;
  }
}
