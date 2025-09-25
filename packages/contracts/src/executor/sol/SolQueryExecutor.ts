import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { decodeErrorResult, decodeFunctionResult, encodeFunctionData } from 'viem/utils';
import { ContractDispatchError, SolContractExecutionError } from '../../errors.js';
import {
  ContractCallOptions,
  ContractCallResult,
  GenericContractCallResult,
  GenericContractQueryCall,
} from '../../types/index.js';
import {
  ensureContractPresence,
  ensureParamsLength,
  ensureValidAccountId32Address,
  toReturnFlags,
} from '../../utils/index.js';
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
      ensureValidAccountId32Address(caller);

      const bytes = encodeFunctionData({
        abi: this.abi,
        functionName: abiFunction.name,
        args: params.slice(0, inputs.length),
      });

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      await ensureContractPresence(client, true, this.address, this.registry.cache);

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

      const data = raw.result.value.data;
      if (flags.revert) {
        let errorResult;
        try {
          errorResult = decodeErrorResult({
            abi: this.abi,
            data,
          });
        } catch (e: any) {
          // TODO make this better, handle panic!, assert! cases
          throw new SolContractExecutionError(raw, { message: `Failed to decode error. Details: ${e.message}` });
        }

        throw new SolContractExecutionError(raw, { details: errorResult });
      }

      try {
        let decodedData: any[] = decodeFunctionResult({
          abi: this.abi,
          functionName: abiFunction.name,
          data,
        });

        // if this is a tx, then this is a dry run, so the data will be default to []
        const isTx = abiFunction.stateMutability === 'payable' || abiFunction.stateMutability === 'nonpayable';
        if (isTx && data === '0x' && decodedData === undefined) {
          decodedData = [];
        }

        return {
          data: decodedData,
          raw,
          flags,
          inputData: bytes,
        } as GenericContractCallResult;
      } catch (e: any) {
        throw new SolContractExecutionError(raw, { message: `Failed to decode result. Details: ${e.message}` });
      }
    };

    callFn.meta = abiFunction;

    return callFn;
  }
}
