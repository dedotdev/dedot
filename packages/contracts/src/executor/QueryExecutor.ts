import type { PalletContractsPrimitivesContractResult } from '@dedot/api/chaintypes';
import { Result } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, u8aToHex } from '@dedot/utils';
import { ContractDispatchError, ContractLangError } from '../errors.js';
import {
  ContractCallOptions,
  ContractCallMessage,
  GenericContractQueryCall,
  GenericContractCallResult,
} from '../types/index.js';
import { normalizeLabel } from '../utils.js';
import { Executor } from './Executor.js';

export class QueryExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(message: string) {
    const meta = this.#findMessage(message);
    assert(meta, `Query message not found: ${message}`);

    const callFn: GenericContractQueryCall<ChainApi> = async (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const callOptions = params[args.length] as ContractCallOptions;
      const { caller, value = 0n, gasLimit, storageDepositLimit } = callOptions;
      assert(caller, 'Expected a valid caller address in ContractCallOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      const raw: PalletContractsPrimitivesContractResult = await this.api.call.contractsApi.call(
        caller,
        this.address,
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

      return {
        data: data.value,
        raw,
      } as GenericContractCallResult;
    };

    callFn.meta = meta;

    return callFn;
  }

  #findMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => normalizeLabel(one.label) === message);
  }
}
