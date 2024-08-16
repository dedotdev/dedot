import { PalletContractsPrimitivesCode, PalletContractsPrimitivesContractResultResult } from '@dedot/api/chaintypes';
import { Result } from '@dedot/shape';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, assertFalse, concatU8a, hexToU8a, isNull, isUndefined, isWasm, u8aToHex } from '@dedot/utils';
import { ContractInstantiateDispatchError, ContractInstantiateLangError } from '../errors.js';
import { ConstructorCallOptions, GenericConstructorCallResult, GenericConstructorQueryCall } from '../types/index.js';
import { toReturnFlags } from '../utils.js';
import { DeployerExecutor } from './DeployerExecutor.js';

export class ConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends DeployerExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<ChainApi> = async (...params: any[]) => {
      const { args } = meta;

      assertFalse(params.length < args.length, `Expected at least ${args.length} arguments, got ${params.length}`);
      assertFalse(params.length > args.length + 1, `Expected at most ${args.length + 1} arguments, got ${params.length}`);

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
        type: isWasm(this.code) ? 'Upload' : 'Existing',
        value: this.code,
      } as PalletContractsPrimitivesCode;

      const raw: PalletContractsPrimitivesContractResultResult = await this.api.call.contractsApi.instantiate(
        caller,
        value,
        gasLimit,
        storageDepositLimit,
        code,
        bytes,
        salt,
      );

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
        address: raw.result.value.accountId,
        flags: toReturnFlags(bits),
      } as GenericConstructorCallResult;
    };

    callFn.meta = meta;

    return callFn;
  }
}
