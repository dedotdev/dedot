import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { assert, concatU8a, hexToU8a, isWasm, stringCamelCase, u8aToHex } from '@dedot/utils';
import { ISubstrateClient } from 'dedot';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ConstructorOptions, ContractConstructor, GenericConstructorTxCall } from '../types/index.js';
import { Executor } from './Executor.js';

export class ConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  protected readonly code: Hash | Uint8Array | string;

  constructor(api: ISubstrateClient<ChainApi>, registry: TypinkRegistry, code: Hash | Uint8Array | string) {
    super(api, registry);
    this.code = code;
  }

  doExecute(constructor: string): any {
    const constructorMeta = this.findConstructorMeta(constructor);

    assert(constructorMeta, `Constructor not found: ${constructor}`);

    const callFn: GenericConstructorTxCall<ChainApi> = (...params: any) => {
      const { args } = constructorMeta;
      const { value, gasLimit, storageDepositLimit, salt } = params[args.length] as ConstructorOptions;

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(constructorMeta.selector), ...formattedInputs));

      if (isWasm(this.code)) {
        return this.api.tx.contracts.instantiateWithCode(value, gasLimit, storageDepositLimit, this.code, bytes, salt);
      } else {
        return this.api.tx.contracts.instantiate(value, gasLimit, storageDepositLimit, this.code, bytes, salt);
      }
    };

    callFn.meta = constructorMeta;

    return callFn;
  }

  protected findConstructorMeta(constructor: string): ContractConstructor | undefined {
    return this.metadata.spec.constructors.find((one) => stringCamelCase(one.label) === constructor);
  }
}
