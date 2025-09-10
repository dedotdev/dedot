import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, HexString, isUndefined } from '@dedot/utils';
import { ContractTxOptions, GenericContractTxCall } from '../../types/index.js';
import { SolContractExecutor } from './abstract/SolContractExecutor.js';

export class SolTxExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(fragmentName: string) {
    const fragment = this.findTxFragment(fragmentName);
    assert(fragment, `Tx fragment not found: ${fragmentName}`);

    const callFn: GenericContractTxCall<ChainApi> = (...params: any[]) => {
      const { inputs } = fragment;
      assert(params.length === inputs.length + 1, `Expected ${inputs.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[inputs.length] as ContractTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ContractTxOptions');
      assert(!isUndefined(storageDepositLimit), 'Expected a storage deposit limit in ContractTxOptions');

      const bytes = this.interf.encodeFunctionData(fragment, params.slice(0, inputs.length));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      return client.tx.revive.call(
        this.address as HexString, // --
        value,
        gasLimit,
        storageDepositLimit || 0n,
        bytes,
      );
    };

    callFn.meta = fragment;

    return callFn;
  }
}
