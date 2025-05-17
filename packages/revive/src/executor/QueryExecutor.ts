import type { PalletRevivePrimitivesContractResult } from '@dedot/api/chaintypes';
import { Result } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, assertFalse, concatU8a, hexToU8a, u8aToHex } from '@dedot/utils';
import { ContractDispatchError, ContractLangError } from '../errors.js';
import { ContractCallOptions, GenericContractCallResult, GenericContractQueryCall } from '../types.js';
import { toReturnFlags } from '../utils.js';
import { ContractExecutor } from './abstract/index.js';

export class QueryExecutor<ChainApi extends GenericSubstrateApi> extends ContractExecutor<ChainApi> {
  doExecute(message: string) {
    const meta = this.findMessage(message);
    assert(meta, `Query message not found: ${message}`);

    const callFn: GenericContractQueryCall<ChainApi> = async (...params: any[]) => {
      const { args } = meta;

      assertFalse(params.length < args.length, `Expected at least ${args.length} arguments, got ${params.length}`);
      assertFalse(
        params.length > args.length + 1,
        `Expected at most ${args.length + 1} arguments, got ${params.length}`,
      );

      const callOptions = (params[args.length] || {}) as ContractCallOptions;
      const { caller = this.options.defaultCaller, value = 0n, gasLimit, storageDepositLimit } = callOptions;
      assert(caller, 'Expected a valid caller address in ContractCallOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const raw: PalletRevivePrimitivesContractResult = await this.client.call.reviveApi.call(
        caller,
        this.address.raw,
        value,
        gasLimit,
        storageDepositLimit,
        bytes,
      );

      if (raw.result.isErr) {
        throw new ContractDispatchError(raw.result.err, raw);
      }

      const data = this.tryDecode(meta, raw.result.value.data) as Result<any, any>;

      if (data.isErr) {
        throw new ContractLangError(data.err, raw);
      }

      const bits = raw.result.value.flags.bits;

      return {
        data: data.value,
        raw,
        flags: toReturnFlags(bits),
      } as GenericContractCallResult;
    };

    callFn.meta = meta;

    return callFn;
  }
}
