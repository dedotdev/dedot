import { GenericSubstrateApi } from '@dedot/types';
import { assert, assertFalse, concatU8a, hexToU8a, isNull, isUndefined, isWasm, u8aToHex } from '@dedot/utils';
import { ConstructorTxOptions, GenericConstructorTxCall } from '../types/index.js';
import { DeployerExecutor } from './DeployerExecutor.js';

export class ConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends DeployerExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
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
}
