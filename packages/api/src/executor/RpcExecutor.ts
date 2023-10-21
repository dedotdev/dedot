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

      if (result === null) {
        return null;
      }

      //TODO format with outputType
      return this.registry.findCodec(def.type).tryDecode(result);
    };

    return fnRpc;
  }
}
