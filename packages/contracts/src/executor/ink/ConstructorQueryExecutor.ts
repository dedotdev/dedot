import type { ISubstrateClient } from '@dedot/api';
import { Result } from '@dedot/shape';
import { assert, concatU8a, hexToU8a, isPvm, isUndefined, isWasm, toHex, toU8a, u8aToHex } from '@dedot/utils';
import { ContractInstantiateDispatchError, ContractInstantiateLangError } from '../../errors.js';
import {
  ConstructorCallOptions,
  ContractCode,
  ContractInstantiateResult,
  GenericConstructorCallResult,
  GenericConstructorQueryCall,
} from '../../types/index.js';
import { ensureParamsLength, ensureValidAccountId32Address, toReturnFlags } from '../../utils/index.js';
import { DeployerExecutor } from './abstract/index.js';

export class ConstructorQueryExecutor extends DeployerExecutor {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<any, any, 'ink'> = async (...params: any[]) => {
      const { args } = meta;

      ensureParamsLength(args.length, params.length);

      const callOptions = (params[args.length] || {}) as ConstructorCallOptions;
      const {
        caller = this.options.defaultCaller, // --
        value = 0n,
        gasLimit,
        storageDepositLimit,
        salt,
      } = callOptions;
      assert(caller, 'Expected a valid caller address in ConstructorCallOptions');
      ensureValidAccountId32Address(caller);

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const isUpload = isPvm(this.code) || isWasm(this.code);
      const code = {
        type: isUpload ? 'Upload' : 'Existing',
        value: this.code,
      } as ContractCode;

      const client = this.client as unknown as ISubstrateClient;

      const raw: ContractInstantiateResult = await (async () => {
        if (this.registry.isRevive()) {
          assert(
            isUndefined(salt) || toU8a(salt).byteLength == 32,
            'Invalid salt provided in ConstructorCallOptions: expected a 32-byte value as a hex string or a Uint8Array',
          );

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
        } else {
          const raw = await client.call.contractsApi.instantiate(
            caller, // --
            value,
            gasLimit,
            storageDepositLimit,
            code,
            bytes,
            salt || '0x',
          );

          const result = raw.result;
          if (result.isOk) {
            // @ts-ignore
            result.value.address = result.value.accountId.address();

            // @ts-ignore
            delete result.value.accountId;
          }

          return {
            gasConsumed: raw.gasConsumed,
            gasRequired: raw.gasRequired,
            storageDeposit: raw.storageDeposit,
            debugMessage: raw.debugMessage,
            result,
          } as ContractInstantiateResult;
        }
      })();

      if (raw.result.isErr) {
        const dispatchError = raw.result.err;
        const moduleError = client.registry.findErrorMeta(dispatchError);
        throw new ContractInstantiateDispatchError(dispatchError, raw, moduleError);
      }

      const data = this.tryDecode(meta, raw.result.value.result.data) as Result<any, any>;

      if (data.isErr) {
        throw new ContractInstantiateLangError(data.err, raw);
      }

      const bits = raw.result.value.result.flags.bits;

      return {
        data: data.value,
        raw,
        address: raw.result.value.address,
        flags: toReturnFlags(bits),
        inputData: bytes,
      } as GenericConstructorCallResult;
    };

    callFn.meta = meta;

    return callFn;
  }
}
