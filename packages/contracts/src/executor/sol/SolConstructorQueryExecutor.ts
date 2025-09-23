import { type ISubstrateClient } from '@dedot/api';
import { type SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, DedotError, isPvm, isUndefined, toHex, toU8a } from '@dedot/utils';
import { decodeErrorResult, encodeDeployData, DecodeErrorResultReturnType } from 'viem/utils';
import { ContractInstantiateDispatchError, SolContractInstantiateCustomError } from '../../errors.js';
import {
  GenericConstructorQueryCall,
  ConstructorCallOptions,
  ContractCode,
  ContractInstantiateResult,
  GenericConstructorCallResult,
} from '../../types/index.js';
import { ensureParamsLength, toReturnFlags } from '../../utils/index.js';
import { SolDeployerExecutor } from './abstract/index.js';

export class SolConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends SolDeployerExecutor<ChainApi> {
  doExecute(_: string) {
    const fragment = this.findConstructorFragment();
    assert(fragment, `There are no constructor fragment existed in the ABI`);

    const callFn: GenericConstructorQueryCall<ChainApi, any, 'sol'> = async (...params: any[]) => {
      const { inputs } = fragment;

      ensureParamsLength(inputs.length, params.length);

      const callOptions = (params[inputs.length] || {}) as ConstructorCallOptions;
      const {
        caller = this.options.defaultCaller, // --
        value = 0n,
        gasLimit,
        storageDepositLimit,
        salt,
      } = callOptions;
      assert(caller, 'Expected a valid caller address in ConstructorCallOptions');
      assert(
        isUndefined(salt) || toU8a(salt).byteLength == 32,
        'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
      );

      const bytes = encodeDeployData({
        abi: this.abi,
        bytecode: '0x',
        args: params.slice(0, inputs.length),
      });

      const isUpload = isPvm(this.code);
      const code = {
        type: isUpload ? 'Upload' : 'Existing',
        value: this.code,
      } as ContractCode;

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const raw: ContractInstantiateResult<ChainApi> = await (async () => {
        const raw = await client.call.reviveApi.instantiate(
          caller, // --
          value,
          gasLimit,
          storageDepositLimit,
          code,
          bytes,
          salt ? toHex(salt) : undefined,
        );

        const result = raw.result;
        if (result.isOk) {
          // @ts-ignore
          result.value.address = result.value.addr;

          // @ts-ignore
          delete result.value.addr;
        }

        return {
          gasConsumed: raw.gasConsumed,
          gasRequired: raw.gasRequired,
          storageDeposit: raw.storageDeposit,
          result,
        } as ContractInstantiateResult<ChainApi>;
      })();

      if (raw.result.isErr) {
        const moduleError = client.registry.findErrorMeta(raw.result.err);
        throw new ContractInstantiateDispatchError(raw.result.err, raw, moduleError);
      }

      const flags = toReturnFlags(raw.result.value.result.flags.bits);

      if (flags.revert) {
        let errorDesc: DecodeErrorResultReturnType;
        try {
          // This could be failed if the errors is thrown by panic! or assert!
          // Because for now, those error data format is not correctly encoded
          errorDesc = decodeErrorResult({
            abi: this.abi,
            data: raw.result.value.result.data,
          });
        } catch (e) {
          throw new DedotError(`Failed to decode revert reason ${(e as Error).message}`);
        }

        throw new SolContractInstantiateCustomError(errorDesc.errorName, raw, errorDesc);
      }

      return {
        data: raw.result.value.result.data,
        raw,
        flags,
        address: raw.result.value.address,
        inputData: bytes,
      } as GenericConstructorCallResult;
    };

    callFn.meta = fragment;

    return callFn;
  }
}
