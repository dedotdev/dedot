import Executor from './Executor';
import { assert, concatU8a, hexToU8a, stringCamelCase, u8aToHex } from '@dedot/utils';
import { GenericContractQueryCall, ContractMessage } from '../types';
import { AccountId32 } from '@dedot/codecs';
import { ContractOptions } from '../types';

export class QueryExecutor extends Executor {
  doExecute(message: string): GenericContractQueryCall {
    const messageMeta = this.#findMessage(message);

    assert(messageMeta, `Query message not found: ${message}`);

    const callFn: GenericContractQueryCall = async (...params: any) => {
      const { args } = messageMeta;

      let caller = this.address;
      let contractOptions: ContractOptions = {} as ContractOptions;
      for (let i = args.length; i < params.length; i += 1) {
        if (i === args.length) {
          assert(params[i] instanceof AccountId32, 'Unexpected additional parameter');
          caller = params[i];
        }
        if (i === args.length + 1) {
          assert(params[i] as ContractOptions, 'Unexpected additional parameter');
          contractOptions = params[i];
        }
      }

      const formattedInputs = args.map((arg, index) => this.tryEncode(arg, params[index]));
      const bytes = u8aToHex(concatU8a(hexToU8a(messageMeta.selector), ...formattedInputs));

      const contractResult = await this.api.call.contractsApi.call(
        caller,
        this.address,
        contractOptions.value || 0n,
        contractOptions.gasLimit,
        contractOptions.storageDepositLimit,
        bytes,
      );

      assert('value' in contractResult.result);

      return {
        data: this.tryDecode(messageMeta, contractResult.result.value.data),
        result: contractResult,
      };
    };

    callFn.meta = messageMeta;

    return callFn;
  }

  #findMessage(message: string): ContractMessage | undefined {
    return this.contractMetadata.spec.messages.find((one) => stringCamelCase(one.label) === message);
  }
}
