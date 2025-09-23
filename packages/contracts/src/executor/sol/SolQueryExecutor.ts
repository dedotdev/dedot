import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, DedotError, HexString } from '@dedot/utils';
import { decodeErrorResult, DecodeErrorResultReturnType, decodeFunctionResult, encodeFunctionData } from 'viem/utils';
import { ContractDispatchError, SolContractCustomError } from '../../errors.js';
import {
  ContractCallOptions,
  ContractCallResult,
  GenericContractCallResult,
  GenericContractQueryCall,
} from '../../types/index.js';
import { ensureContractPresence, ensureParamsLength, toReturnFlags } from '../../utils/index.js';
import { SolContractExecutor } from './abstract/SolContractExecutor.js';

export class SolQueryExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(name: string) {
    const abiFunction = this.registry.findAbiFunction(name);
    assert(abiFunction, `Abi item not found: ${name}`);

    const callFn: GenericContractQueryCall<ChainApi, any, 'sol'> = async (...params: any[]) => {
      const { inputs } = abiFunction;

      ensureParamsLength(inputs.length, params.length);

      const callOptions = (params[inputs.length] || {}) as ContractCallOptions;
      const { caller = this.options.defaultCaller, value = 0n, gasLimit, storageDepositLimit } = callOptions;
      assert(caller, 'Expected a valid caller address in ContractCallOptions');

      const bytes = encodeFunctionData({
        abi: this.abi,
        functionName: abiFunction.name,
        args: params.slice(0, inputs.length),
      });

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      // TODO cache this call
      await ensureContractPresence(client, true, this.address);

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
        const moduleError = client.registry.findErrorMeta(raw.result.err);
        throw new ContractDispatchError(raw.result.err, raw, moduleError);
      }

      const flags = toReturnFlags(raw.result.value.flags.bits);

      if (flags.revert) {
        let errorDesc: DecodeErrorResultReturnType;
        try {
          // This could be failed if the errors is thrown by panic! or assert!
          // Because for now, those error data format is not correctly encoded
          errorDesc = decodeErrorResult({
            abi: this.abi,
            data: raw.result.value.data,
          });
        } catch (e) {
          throw new DedotError(`Failed to decode revert reason ${(e as Error).message}`);
        }

        throw new SolContractCustomError(errorDesc.errorName, raw, errorDesc);
      }

      const data: any[] = decodeFunctionResult({
        abi: this.abi,
        functionName: abiFunction.name,
        data: raw.result.value.data,
      });

      return {
        data,
        raw,
        flags,
        inputData: bytes,
      } as GenericContractCallResult;
    };

    callFn.meta = abiFunction;

    return callFn;
  }
}
