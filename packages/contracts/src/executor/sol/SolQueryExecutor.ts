import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, assertFalse, HexString } from '@dedot/utils';
import { ContractDispatchError } from '../../errors.js';
import {
  ContractCallOptions,
  ContractCallResult,
  GenericContractCallResult,
  GenericContractQueryCall,
} from '../../types/index.js';
import { toReturnFlags } from '../../utils/index.js';
import { SolContractExecutor } from './abstract/SolContractExecutor.js';

export class SolQueryExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(fragmentName: string) {
    const fragment = this.findFragment(fragmentName);
    assert(fragment, `Query fragment not found: ${fragmentName}`);

    const callFn: GenericContractQueryCall<ChainApi> = async (...params: any[]) => {
      const { inputs } = fragment;

      assertFalse(params.length < inputs.length, `Expected at least ${inputs.length} arguments, got ${params.length}`);
      assertFalse(
        params.length > inputs.length + 1,
        `Expected at most ${inputs.length + 1} arguments, got ${params.length}`,
      );

      const callOptions = (params[inputs.length] || {}) as ContractCallOptions;
      const { caller = this.options.defaultCaller, value = 0n, gasLimit, storageDepositLimit } = callOptions;
      assert(caller, 'Expected a valid caller address in ContractCallOptions');

      const bytes = this.interf.encodeFunctionData(fragment, params.slice(0, inputs.length));

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const raw: ContractCallResult<ChainApi> = await (async () => {
        const raw = await client.call.reviveApi.call(
          caller, // --
          this.address as HexString,
          value,
          gasLimit,
          storageDepositLimit,
          bytes,
        );

        return {
          gasConsumed: raw.gasConsumed,
          gasRequired: raw.gasRequired,
          storageDeposit: raw.storageDeposit,
          result: raw.result,
        } as ContractCallResult<ChainApi>;
      })();

      if (raw.result.isErr) {
        throw new ContractDispatchError(raw.result.err, raw);
      }

      const data = this.interf.decodeFunctionResult(fragment, raw.result.value.data);
      const bits = raw.result.value.flags.bits;

      return {
        data,
        raw,
        flags: toReturnFlags(bits),
        inputData: bytes,
      } as GenericContractCallResult;
    };

    callFn.meta = fragment;

    return callFn;
  }
}
