import type { ISubstrateClient } from '@dedot/api';
import {
  PalletContractsPrimitivesCode,
  PalletContractsPrimitivesContractResultResult,
  type SubstrateApi,
} from '@dedot/api/chaintypes';
import type { DispatchError } from '@dedot/codecs';
import { Result } from '@dedot/shape';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, assertFalse, concatU8a, hexToU8a, isNull, isUndefined, isWasm, u8aToHex } from '@dedot/utils';
import { ContractInstantiateDispatchError, ContractInstantiateLangError } from '../errors.js';
import {
  ConstructorCallOptions,
  ContractCode,
  GenericConstructorCallResult,
  GenericConstructorQueryCall,
  InstantiateReturnValue,
  NewContractInstantiateResult,
  StorageDeposit,
  WeightV2,
} from '../types/index.js';
import { toReturnFlags } from '../utils.js';
import { DeployerExecutor } from './abstract/index.js';

export class ConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends DeployerExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<ChainApi> = async (...params: any[]) => {
      const { args } = meta;

      assertFalse(params.length < args.length, `Expected at least ${args.length} arguments, got ${params.length}`);
      assertFalse(
        params.length > args.length + 1,
        `Expected at most ${args.length + 1} arguments, got ${params.length}`,
      );

      const callOptions = (params[args.length] || {}) as ConstructorCallOptions;
      const {
        caller = this.options.defaultCaller,
        value = 0n,
        gasLimit,
        storageDepositLimit,
        salt = '0x',
      } = callOptions;
      assert(caller, 'Expected a valid caller address in ConstructorCallOptions');
      assertFalse(isNull(salt) || isUndefined(salt), 'Expected a salt in ConstructorCallOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));
      const code = {
        // TODO support pvm
        type: isWasm(this.code) ? 'Upload' : 'Existing',
        value: this.code,
      } as ContractCode;

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const raw: NewContractInstantiateResult = await (async () => {
        if (this.registry.isInkV6()) {
          const raw = await client.call.reviveApi.instantiate(
            caller, // --
            value,
            gasLimit,
            storageDepositLimit,
            code,
            bytes,
            salt,
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
          } as NewContractInstantiateResult;
        } else {
          const raw = await client.call.contractsApi.instantiate(
            caller, // --
            value,
            gasLimit,
            storageDepositLimit,
            code,
            bytes,
            salt,
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
            result,
            debugMessage: raw.debugMessage,
          } as NewContractInstantiateResult;
        }
      })();

      if (raw.result.isErr) {
        throw new ContractInstantiateDispatchError(raw.result.err, raw);
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
      } as GenericConstructorCallResult;
    };

    callFn.meta = meta;

    return callFn;
  }
}
