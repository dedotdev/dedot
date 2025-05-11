import { ISubstrateClient } from '@dedot/api';
import type {
  PalletContractsPrimitivesContractResult,
  PalletRevivePrimitivesContractResult,
  SubstrateApi,
} from '@dedot/api/chaintypes';
import { AccountId20Like, AccountId32Like, H160, Result } from '@dedot/codecs';
import { GenericSubstrateApi, RpcV2, RpcVersion } from '@dedot/types';
import { assert, assertFalse, concatU8a, HexString, hexToU8a, u8aToHex } from '@dedot/utils';
import { ContractDispatchError, ContractLangError } from '../errors.js';
import { ContractCallOptions, GenericContractQueryCall, GenericContractCallResult } from '../types/index.js';
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

      if (this.palletReviveCompatible) {
        const raw: PalletRevivePrimitivesContractResult = await client.call.reviveApi.call(
          caller,
          this.address.address() as unknown as H160,
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
      } else {
        const raw: PalletContractsPrimitivesContractResult = await client.call.contractsApi.call(
          caller,
          this.address as AccountId32Like,
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
      }
    };

    callFn.meta = meta;

    return callFn;
  }
}
