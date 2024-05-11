import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, isWasm, u8aToHex } from '@dedot/utils';
import { ConstructorCallOptions, GenericConstructorQueryCall, GenericContractQueryCall } from '../types/index.js';
import { ConstructorTxExecutor } from './ConstructorTxExecutor';

export class ConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends ConstructorTxExecutor<ChainApi> {
  doExecute(constructor: string): any {
    const constructorMeta = this.findConstructorMeta(constructor);

    assert(constructorMeta, `Constructor not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<ChainApi> = (...params: any) => {
      const { args } = constructorMeta;
      const { caller, value, gasLimit, storageDepositLimit, salt } = params[args.length] as ConstructorCallOptions;

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(constructorMeta.selector), ...formattedInputs));
      const code = {
        tag: isWasm(this.code) ? 'Upload' : 'Existing',
        value: this.code,
      };

      return this.api.call.contractsApi.instantiate(caller, value, gasLimit, storageDepositLimit, code, bytes, salt);
    };

    callFn.meta = constructorMeta;

    return callFn;
  }
}
