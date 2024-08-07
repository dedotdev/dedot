import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, u8aToHex } from '@dedot/utils';
import { ContractCallMessage, ContractTxOptions, GenericContractTxCall } from '../types/index.js';
import { normalizeLabel } from '../utils.js';
import { Executor } from './Executor.js';

export class TxExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(message: string) {
    const meta = this.#findTxMessage(message);
    assert(meta, `Tx message not found: ${message}`);

    const callFn: GenericContractTxCall<ChainApi> = (...params: any[]) => {
      const { args } = meta;
      assert(params.length === args.length + 1, `Expected ${args.length + 1} arguments, got ${params.length}`);

      const txCallOptions = params[args.length] as ContractTxOptions;
      const { value = 0n, gasLimit, storageDepositLimit } = txCallOptions;
      assert(gasLimit, 'Expected a gas limit in ContractTxOptions');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(meta.selector), ...formattedInputs));

      return this.api.tx.contracts.call(this.address, value, gasLimit, storageDepositLimit, bytes);
    };

    callFn.meta = meta;

    return callFn;
  }

  #findTxMessage(message: string): ContractCallMessage | undefined {
    return this.metadata.spec.messages.find((one) => one.mutates && normalizeLabel(one.label) === message);
  }
}
