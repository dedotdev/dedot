import { GenericSubstrateApi } from '@dedot/types';
import { assert, concatU8a, hexToU8a, stringCamelCase, u8aToHex } from '@dedot/utils';
import { GenericContractQueryCall, ContractMessage, ContractCallOptions } from '../types/index.js';
import { Executor } from './Executor.js';

export class QueryExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(message: string): GenericContractQueryCall {
    const messageMeta = this.#findMessage(message);

    assert(messageMeta, `Query message not found: ${message}`);

    const callFn: GenericContractQueryCall = async (...params: any) => {
      const { args } = messageMeta;
      const { caller, value, gasLimit, storageDepositLimit } = params[args.length] as ContractCallOptions;

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(messageMeta.selector), ...formattedInputs));

      const contractResult = await this.api.call.contractsApi.call(
        caller,
        this.address,
        value,
        gasLimit,
        storageDepositLimit,
        bytes,
      );

      if (contractResult.result.value) {
        return {
          isOk: true,
          data: this.tryDecode(messageMeta, contractResult.result.value.data),
          contractResult: contractResult,
        };
      }

      return {
        isOk: false,
        contractResult: contractResult,
      };
    };

    callFn.meta = messageMeta;

    return callFn;
  }

  #findMessage(message: string): ContractMessage | undefined {
    return this.metadata.spec.messages.find((one) => stringCamelCase(one.label) === message);
  }
}
