import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { isFunction, u8aToHex } from '@polkadot/util';
import { findAliasRpcSpec, findRpcSpec, RpcCallSpec, RpcParamSpec } from '@delightfuldot/specs';
import { GenericSubstrateApi, Unsub } from '@delightfuldot/types';
import { assert, isJsPrimitive } from '@delightfuldot/utils';
import { Executor } from './Executor';

export class RpcExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(section: string, method: string) {
    const maybeRpcName = `${section}_${method}`;
    const callSpec = findRpcSpec(maybeRpcName) || findAliasRpcSpec(maybeRpcName);
    const rpcName = callSpec?.name || `${section}_${method}`;
    const isSubscription = !!callSpec?.pubsub;

    const fnRpc = async (...args: any[]): Promise<any> => {
      if (!callSpec) {
        throw Error('Invalid rpc call spec!');
      }

      const { params } = callSpec;
      if (params.length !== args.length && params.filter((param) => !param.isOptional).length !== args.length) {
        // TODO check for optional
        throw new Error(`Miss match input length, required: ${JSON.stringify(params)}, current inputs: ${args.length}`);
      }

      const formattedInputs = args.map((input, index) => this.tryEncode(params[index], input));

      const result = await this.provider.send<any>(rpcName, formattedInputs);

      return this.tryDecode(callSpec, result);
    };

    const fnSubRpc = async (...args: any[]): Promise<Unsub> => {
      assert(callSpec, 'Invalid rpc call spec!');

      const inArgs = args.slice();
      const callback = inArgs.pop();
      assert(isFunction(callback), 'A callback is required for subscription');

      const onNewMessage = (error?: Error | null, result?: unknown) => {
        if (error) {
          console.error(error);
          return;
        }

        callback(this.tryDecode(callSpec!, result));
      };

      const { params, pubsub } = callSpec!;
      const formattedInputs = inArgs.map((input, index) => this.tryEncode(params[index], input));
      const [subname, subscribe, unsubcribe] = pubsub!;

      const subscription = this.provider.subscribe(subname, subscribe, formattedInputs, onNewMessage);

      return async () => {
        return subscription
          .then((subscriptionId) => this.provider.unsubscribe(subname, unsubcribe, subscriptionId))
          .catch((err) => {
            console.error(err);
            return false;
          });
      };
    };

    const rawRpc = async (...args: any[]): Promise<any> => {
      return await this.provider.send<any>(rpcName, args);
    };

    if (!callSpec) {
      return rawRpc;
    }

    return isSubscription ? fnSubRpc : fnRpc;
  }

  tryDecode(callSpec: RpcCallSpec, raw: any) {
    if (raw === null) {
      // TODO clarify this & improve this
      return undefined;
    }

    const { type, isScale } = callSpec;

    if (isScale) {
      return this.registry.findCodec(type).tryDecode(raw);
    }

    if (isJsPrimitive(type)) {
      return raw;
    }

    return raw;
  }

  tryEncode(paramSpec: RpcParamSpec, value: any): any {
    const { type, isScale, isOptional } = paramSpec;
    if (isScale) {
      if (isOptional && (value === undefined || value === null)) {
        return null;
      }

      const $codec = this.registry.findCodec(type);
      return u8aToHex($codec.tryEncode(value));
    }

    // TODO generalize this!
    if (value && value['toJSON']) {
      return value.toJSON();
    }

    return value;
  }
}
