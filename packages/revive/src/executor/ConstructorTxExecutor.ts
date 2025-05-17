import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, isPvm, u8aToHex } from '@dedot/utils';
import { ConstructorTxOptions, GenericConstructorTxCall } from '../types.js';
import { DeployerExecutor } from './abstract/index.js';

export class ConstructorTxExecutor<ChainApi extends GenericSubstrateApi> extends DeployerExecutor<ChainApi> {
  doExecute(constructor: string) {
    const meta = this.findConstructorMeta(constructor);
    assert(meta, `Constructor message not found: ${constructor}`);

    const callFn: GenericConstructorTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ConstructorTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit, salt } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ConstructorTxOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      if (isPvm(this.code)) {
        return this.client.tx.revive.instantiateWithCode(
          value, // prettier-end-here
          gasLimit,
          storageDepositLimit,
          this.code,
          bytes,
          salt,
        );
      } else {
        return this.client.tx.revive.instantiate(
          value, // prettier-end-here
          gasLimit,
          storageDepositLimit,
          this.code,
          bytes,
          salt,
        );
      }
    };

    callFn.meta = meta;

    return callFn;
  }
}
