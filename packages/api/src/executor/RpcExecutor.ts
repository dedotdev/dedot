import { Executor } from './Executor';
import { rpcDefinitions } from "@polkadot/types";
import { hexToU8a, isHex, u8aToHex } from "@polkadot/util";

export class RpcExecutor extends Executor {
  execute(section: string, method: string) {
    const def = rpcDefinitions[section][method];
    const rpcName = def.endpoint || `${section}_${method}`;

    const fnRpc = async (...args: unknown[]): Promise<unknown> => {
      if (def.params.length !== args.length && def.params.filter(param => !param.isOptional).length !== args.length) {
        // TODO check for optional
        throw new Error(`Miss match input length, required: ${JSON.stringify(def.params)}, current inputs: ${args.length}`);
      }

      const formattedInputs = args.map((input, index) => {
        // TODO verify & transform inputs type
        return u8aToHex(this.registry.findCodec(def.params[index].type).tryEncode(input));
      });

      //
      const result = await this.provider.send<any>(rpcName, formattedInputs);

      //TODO format with outputType
      if (isHex(result)) {
        const $outputType = this.registry.findCodec(def.type);

        return $outputType.tryDecode(result);
      }

      return result;
    };

    return fnRpc;
  }
}
