import { type ISubstrateClient } from '@dedot/api';
import { type SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, isPvm, isUndefined, toHex, toU8a } from '@dedot/utils';
import { decodeErrorResult, encodeDeployData } from 'viem/utils';
import { ContractInstantiateDispatchError, SolContractInstantiateError } from '../../errors.js';
import {
  ConstructorCallOptions,
  ContractCode,
  ContractInstantiateResult,
  GenericConstructorCallResult,
  GenericConstructorQueryCall,
} from '../../types/index.js';
import { ensureParamsLength, ensureValidAccountId32Address, toReturnFlags } from '../../utils/index.js';
import { SolDeployerExecutor } from './abstract/index.js';

export class SolConstructorQueryExecutor extends SolDeployerExecutor {
  doExecute(_: string) {
    const abiConstructor = this.registry.findAbiConstructor();

    const callFn: GenericConstructorQueryCall<any, any, 'sol'> = async (...params: any[]) => {
      const { inputs } = abiConstructor;

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
      ensureValidAccountId32Address(caller);

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

      const client = this.client as unknown as ISubstrateClient;

      const raw: ContractInstantiateResult = await (async () => {
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
        } as ContractInstantiateResult;
      })();

      if (raw.result.isErr) {
        const moduleError = client.registry.findErrorMeta(raw.result.err);
        throw new ContractInstantiateDispatchError(raw.result.err, raw, moduleError);
      }

      const flags = toReturnFlags(raw.result.value.result.flags.bits);

      const data = raw.result.value.result.data;
      if (flags.revert) {
        let errorResult;
        try {
          errorResult = decodeErrorResult({
            abi: this.abi,
            data,
          });
        } catch (e: any) {
          // TODO make this better, handle panic!, assert! cases
          throw new SolContractInstantiateError(raw, { message: `Failed to decode error. Details: ${e.message}` });
        }

        throw new SolContractInstantiateError(raw, { details: errorResult });
      }

      return {
        data: [],
        raw,
        flags,
        address: raw.result.value.address,
        inputData: bytes,
      } as GenericConstructorCallResult;
    };

    callFn.meta = abiConstructor;

    return callFn;
  }
}
