import type { BaseSubmittableExtrinsic, ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { FormatTypes } from '@ethersproject/abi';
import { ContractTxOptions, GenericContractTxCall } from '../../types/index.js';
import { ensureParamsLength } from '../../utils/index.js';
import { SolQueryExecutor } from './SolQueryExecutor.js';
import { SolContractExecutor } from './abstract/SolContractExecutor.js';

export class SolTxExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(fragmentName: string) {
    const fragment = this.findTxFragment(fragmentName);
    assert(fragment, `Tx fragment not found: ${fragmentName}`);

    const callFn: GenericContractTxCall<ChainApi, any, 'sol'> = (...params: any[]) => {
      const { inputs } = fragment;

      ensureParamsLength(inputs.length, params.length);

      const txCallOptions = (params[inputs.length] || {}) as ContractTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit } = txCallOptions;
      const bytes = this.registry.interf.encodeFunctionData(fragment, params.slice(0, inputs.length));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const tx = (() => {
        return client.tx.revive.call(
          this.address as HexString, // --
          value,
          gasLimit!,
          storageDepositLimit || 0n,
          bytes,
        );
      })();

      (tx as unknown as BaseSubmittableExtrinsic).withHooks({
        beforeSign: async (tx, signerAddress) => {
          const callParams = { ...tx.call.palletCall.params };
          const hasGasLimit = !!callParams.gasLimit;
          const hasStorageDepositLimit = !!callParams.storageDepositLimit;

          // Check if current tx provide gas limit and storage deposit limit
          // If not, we need to do a dry run to get the actual value
          const needsDryRun = !hasGasLimit || !hasStorageDepositLimit;
          if (!needsDryRun) return;

          const executor = new SolQueryExecutor(
            this.client, // --
            this.registry,
            this.address,
            {
              defaultCaller: signerAddress,
              ...this.options,
            },
          );
          const { raw } = await executor.doExecute(fragmentName)(...params);

          const { gasRequired, storageDeposit } = raw;
          if (!callParams.gasLimit) {
            callParams.gasLimit = gasRequired;
          }

          if (!callParams.storageDepositLimit) {
            callParams.storageDepositLimit = storageDeposit.value;
          }

          const newCall = { ...tx.call };
          newCall.palletCall.params = callParams;

          tx.call = newCall;
        },
      });

      return tx;
    };

    callFn.meta = JSON.parse(fragment.format(FormatTypes.json));

    return callFn;
  }
}
