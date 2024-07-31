import { ISubstrateClient } from '@dedot/api';
import { PalletContractsPrimitivesCode, PalletContractsPrimitivesContractResultResult } from '@dedot/api/chaintypes';
import { Hash } from '@dedot/codecs';
import { Result } from '@dedot/shape';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, HexString, hexToU8a, isWasm, u8aToHex } from '@dedot/utils';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractInstantiateDispatchError, ContractInstantiateLangError } from '../errors.js';
import {
  ConstructorCallOptions,
  ContractConstructorMessage,
  GenericConstructorCallResult,
  GenericConstructorQueryCall,
} from '../types/index.js';
import { normalizeLabel, toReturnFlags } from '../utils.js';
import { Executor } from './Executor.js';

export class ConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  protected readonly code: Hash | Uint8Array | HexString | string;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, code: Hash | Uint8Array | string) {
    super(api, registry);
    this.code = code;
  }

  doExecute(constructor: string) {
    const meta = this.#findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<ChainApi> = async (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const callOptions = params[args.length] as ConstructorCallOptions;
      const { caller, value = 0n, gasLimit, storageDepositLimit, salt } = callOptions;
      assert(caller, 'Expected a valid caller address in ConstructorCallOptions');
      assert(salt, 'Expected a salt in ConstructorCallOptions');

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

  #findConstructorMeta(constructor: string): ContractConstructorMessage | undefined {
    return this.metadata.spec.constructors.find((one) => normalizeLabel(one.label) === constructor);
  }
}
