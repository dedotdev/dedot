import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, assertFalse, DedotError, HexString } from '@dedot/utils';
import { ErrorDescription } from '@ethersproject/abi/lib/interface.js';
import { SolContractCustomError, ContractDispatchError } from '../../errors.js';
import {
  ContractCallOptions,
  ContractCallResult,
  GenericContractCallResult,
  SolGenericContractQueryCall,
} from '../../types/index.js';
import { toReturnFlags } from '../../utils/index.js';
import { SolContractExecutor } from './abstract/SolContractExecutor.js';

export class SolQueryExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(fragmentName: string) {
    const fragment = this.findFragment(fragmentName);
    assert(fragment, `Query fragment not found: ${fragmentName}`);

    const callFn: SolGenericContractQueryCall<ChainApi> = async (...params: any[]) => {
      const { inputs } = fragment;

      assertFalse(params.length < inputs.length, `Expected at least ${inputs.length} arguments, got ${params.length}`);
      assertFalse(
        params.length > inputs.length + 1,
        `Expected at most ${inputs.length + 1} arguments, got ${params.length}`,
      );

      const callOptions = (params[inputs.length] || {}) as ContractCallOptions;
      const { caller = this.options.defaultCaller, value = 0n, gasLimit, storageDepositLimit } = callOptions;
      assert(caller, 'Expected a valid caller address in ContractCallOptions');

      const bytes = this.registry.interf.encodeFunctionData(fragment, params.slice(0, inputs.length));

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

      const flags = toReturnFlags(raw.result.value.flags.bits);

      if (flags.revert) {
        let errorDesc: ErrorDescription;
        try {
          // This could be failed if the errors is thrown by panic! or assert!
          // Because for now, those error data format is not correctly encoded
          errorDesc = this.registry.interf.parseError(raw.result.value.data);
        } catch (e) {
          throw new DedotError(`Failed to decode revert reason ${(e as Error).message}`);
        }

        throw new SolContractCustomError(errorDesc.name, raw, errorDesc);
      }

      const data = this.registry.interf.decodeFunctionResult(fragment, raw.result.value.data);

      return {
        data,
        raw,
        flags,
        inputData: bytes,
      } as GenericContractCallResult;
    };

    callFn.meta = fragment;

    return callFn;
  }
}
