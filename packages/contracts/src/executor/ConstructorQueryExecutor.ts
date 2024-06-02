import { ISubstrateClient } from '@dedot/api';
import { PalletContractsPrimitivesCode } from '@dedot/api/chaintypes';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, HexString, hexToU8a, isWasm, u8aToHex } from '@dedot/utils';
import { TypinkRegistry } from '../TypinkRegistry';
import { ConstructorCallOptions, ContractConstructorMessage, GenericConstructorQueryCall } from '../types/index.js';
import { normalizeLabel } from '../utils';
import { Executor } from './Executor';

export class ConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  protected readonly code: Hash | Uint8Array | HexString | string;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, code: Hash | Uint8Array | string) {
    super(api, registry);
    this.code = code;
  }

  doExecute(constructor: string) {
    const meta = this.#findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const callOptions = params[args.length] as ConstructorCallOptions;
      const { caller, value = 0n, gasLimit, storageDepositLimit, salt } = callOptions;
      assert(caller, 'Expected a valid caller address in ConstructorCallOptions');
      assert(salt, 'Expected a salt in ConstructorCallOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));
      const code = {
        tag: isWasm(this.code) ? 'Upload' : 'Existing',
        value: this.code,
      } as PalletContractsPrimitivesCode;

      return this.api.call.contractsApi.instantiate(caller, value, gasLimit, storageDepositLimit, code, bytes, salt);
    };

    callFn.meta = meta;

    return callFn;
  }

  #findConstructorMeta(constructor: string): ContractConstructorMessage | undefined {
    return this.metadata.spec.constructors.find((one) => normalizeLabel(one.label) === constructor);
  }
}
