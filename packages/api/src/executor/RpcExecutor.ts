import { rpcDefinitions } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { Executor } from './Executor';

export class RpcExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  execute(section: string, method: string) {
    const def = rpcDefinitions[section][method];
    const rpcName = def.endpoint || `${section}_${method}`;

    const fnRpc = async (...args: unknown[]): Promise<unknown> => {
      if (def.params.length !== args.length && def.params.filter((param) => !param.isOptional).length !== args.length) {
        // TODO check for optional
        throw new Error(
          `Miss match input length, required: ${JSON.stringify(def.params)}, current inputs: ${args.length}`,
        );
      }

      const formattedInputs = args.map((input, index) => {
        // TODO verify & transform inputs type
        return u8aToHex(this.registry.findCodec(def.params[index].type).tryEncode(input));
      });

      //
      const result = await this.provider.send<any>(rpcName, formattedInputs);

      //TODO format with outputType
      const $outputType = this.registry.findCodec(def.type);
      if (!$outputType) {
        return result; // TODO should we throw an error here!?!
      }

      return $outputType.tryDecode(result);
    };

    return fnRpc;
  }
}
