import type { ISubstrateClient } from '@dedot/api';
import type { SubstrateApi } from '@dedot/api/chaintypes';
import { Result } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, assertFalse, concatU8a, HexString, hexToU8a, u8aToHex } from '@dedot/utils';
import { ContractDispatchError, ContractLangError } from '../errors.js';
import {
  ContractCallOptions,
  GenericContractCallResult,
  GenericContractQueryCall,
  NewContractResult,
} from '../types/index.js';
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

      const client = this.client as unknown as ISubstrateClient<SubstrateApi[RpcVersion]>;

      const raw: NewContractResult = await (async () => {
        if (this.registry.isInkV6()) {
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
          };
        } else {
          const raw = await client.call.contractsApi.call(
            caller, // --
            this.address,
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
          };
        }
      })();

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
