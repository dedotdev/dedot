import { BaseSubmittableExtrinsic, ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, concatU8a, HexString, hexToU8a, isUndefined, u8aToHex } from '@dedot/utils';
import { ContractTxOptions, GenericContractTxCall } from '../types/index.js';
import { QueryExecutor } from './QueryExecutor.js';
import { ContractExecutor } from './abstract/index.js';

export class TxExecutor<ChainApi extends GenericSubstrateApi> extends ContractExecutor<ChainApi> {
  doExecute(message: string) {
    const meta = this.findTxMessage(message);
    assert(meta, `Tx message not found: ${message}`);

    const callFn: GenericContractTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ContractTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit } = txCallOptions;
      // assert(gasLimit, 'Expected a gas limit in ContractTxOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const tx = (() => {
        if (this.registry.isRevive()) {
          return client.tx.revive.call(
            this.address as HexString, // --
            value,
            gasLimit!,
            storageDepositLimit || 0n,
            bytes,
          );
        } else {
          return client.tx.contracts.call(
            this.address as HexString, // --
            value,
            gasLimit!,
            storageDepositLimit,
            bytes,
          );
        }
      })();

      (tx as unknown as BaseSubmittableExtrinsic).withHooks({
        beforeSign: async (tx) => {
          const callParams = { ...tx.call.palletCall.params };

          // TODO check if we should call dry-run

          const executor = new QueryExecutor(this.client, this.registry, this.address, this.options);
          const { raw } = await executor.doExecute(message)(...params.slice(0, -1));

          const { gasRequired, storageDeposit } = raw;
          if (!callParams.gasLimit) {
            callParams.gasLimit = gasRequired;
          }

          if (this.registry.isRevive() && !callParams.storageDepositLimit) {
            callParams.storageDepositLimit = storageDeposit.value;
          }

          const newCall = { ...tx.call };
          newCall.palletCall.params = callParams;

          tx.call = newCall;
        },
      });

      return tx;
    };

    callFn.meta = meta;

    return callFn;
  }
}
