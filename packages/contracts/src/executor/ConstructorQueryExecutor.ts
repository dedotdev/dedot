import { PalletContractsPrimitivesCode } from '@dedot/api/chaintypes';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, isWasm, u8aToHex } from '@dedot/utils';
import { ConstructorCallOptions, GenericConstructorQueryCall } from '../types/index.js';
import { ConstructorTxExecutor } from './ConstructorTxExecutor.js';

export class ConstructorQueryExecutor<ChainApi extends GenericSubstrateApi> extends ConstructorTxExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorQueryCall<ChainApi> = (...params: any): Promise<any> => {
      // TODO verify number of arguments/params & call options presence
      const { args } = meta;
      const callOptions = params[args.length] as ConstructorCallOptions;
      const { caller, value = 0n, gasLimit, storageDepositLimit, salt } = callOptions;

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));
      const code = {
        type: isWasm(this.code) ? 'Upload' : 'Existing',
        value: this.code,
      } as PalletContractsPrimitivesCode;

      return this.api.call.contractsApi.instantiate(caller, value, gasLimit, storageDepositLimit, code, bytes, salt);
    };

    callFn.meta = meta;

    return callFn;
  }
}
