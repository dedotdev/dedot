import { ContractOptions } from '@dedot/types';
import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, stringCamelCase, u8aToHex } from '@dedot/utils';
import Executor from './Executor';

export class TxExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(message: string): any {
    const messageMeta = this.#findTxMessage(message);

    assert(messageMeta, `Tx message not found: ${message}`);

    const callFn = (...params: any) => {
      const { args } = messageMeta;
      let contractOptions: ContractOptions = params[args.length];

      assert(contractOptions.gasLimit, 'gasLimit cannot be undefined');

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(messageMeta.selector), ...formattedInputs));

      return this.api.tx.contracts.call(
        this.address,
        contractOptions.value,
        contractOptions.gasLimit,
        contractOptions.storageDepositLimit,
        bytes,
      );
    };

    callFn.meta = messageMeta;

    return callFn;
  }

  #findTxMessage(message: string) {
    return this.contractMetadata.spec.messages.find((one) => one.mutates && stringCamelCase(one.label) === message);
  }
}
