import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import {
  assert,
  assertFalse,
  concatU8a,
  HexString,
  hexToU8a,
  isNull,
  isUndefined,
  isWasm,
  u8aToHex,
} from '@dedot/utils';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ConstructorTxOptions, ContractConstructorMessage, GenericConstructorTxCall } from '../types/index.js';
import { normalizeLabel } from '../utils.js';
import { Executor } from './Executor.js';

export class ConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  protected readonly code: Hash | Uint8Array | HexString | string;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, code: Hash | Uint8Array | string) {
    super(api, registry);
    this.code = code;
  }

  doExecute(constructor: string) {
    const meta = this.#findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt = '0x' } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ConstructorTxOptions');
      assertFalse(isNull(salt) || isUndefined(salt), 'Expected a salt in ConstructorCallOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      if (isWasm(this.code)) {
        return this.api.tx.contracts.instantiateWithCode(value, gasLimit, storageDepositLimit, this.code, bytes, salt);
      } else {
        return this.api.tx.contracts.instantiate(value, gasLimit, storageDepositLimit, this.code, bytes, salt);
      }
    };

    callFn.meta = meta;

    return callFn;
  }

  #findConstructorMeta(constructor: string): ContractConstructorMessage | undefined {
    return this.metadata.spec.constructors.find((one) => normalizeLabel(one.label) === constructor);
  }
}
