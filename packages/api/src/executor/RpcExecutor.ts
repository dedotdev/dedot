import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { isFunction, u8aToHex } from '@polkadot/util';
import { findAliasRpcSpec, findRpcSpec } from '@delightfuldot/specs';
import { GenericSubstrateApi, Unsub, RpcCallSpec, RpcParamSpec, GenericRpcCall } from '@delightfuldot/types';
import { assert, isJsPrimitive } from '@delightfuldot/utils';
import { Executor } from './Executor';

const isOptionalParam = (param: RpcParamSpec): boolean => {
  return param.isOptional || param.name.startsWith('Option<');
};

export class RpcExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(section: string, method: string): GenericRpcCall {
    const maybeRpcName = `${section}_${method}`;
    const callSpec = findRpcSpec(maybeRpcName) || findAliasRpcSpec(maybeRpcName);
    const rpcName = callSpec?.name || `${section}_${method}`;
    const isSubscription = !!callSpec?.pubsub;

    const fnRpc = async (...args: any[]): Promise<any> => {
      assert(callSpec, 'Rpc spec not found');
      this.checkRpcInputs(callSpec, args);

      const { params } = callSpec;
      const formattedInputs = args.map((input, index) => this.tryEncode(params[index], input));

      const result = await this.provider.send<any>(rpcName, formattedInputs);

      return this.tryDecode(callSpec, result);
    };

    const fnSubRpc = async (...args: any[]): Promise<Unsub> => {
      assert(callSpec, 'Rpc spec not found');

      const inArgs = args.slice();
      const callback = inArgs.pop();
      assert(isFunction(callback), 'A callback is required for subscription');
      this.checkRpcInputs(callSpec, inArgs);

      const onNewMessage = (error?: Error | null, result?: unknown) => {
        if (error) {
          console.error(error);
          return;
        }

        callback(this.tryDecode(callSpec, result));
      };

      const { params, pubsub } = callSpec;
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

    if (!callSpec) {
      // Call arbitrary rpc method
      return async (...args: any[]): Promise<any> => {
        return await this.provider.send<any>(rpcName, args);
      };
    }

    const oneFnRpc: GenericRpcCall = isSubscription ? fnSubRpc : fnRpc;
    oneFnRpc.meta = callSpec;

    return oneFnRpc;
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

  checkRpcInputs(callSpec: RpcCallSpec, actualArgs: any[]) {
    const params = callSpec.params;
    if (params.length === actualArgs.length) {
      return;
    }

    params.forEach((param, idx) => {
      const isRequiredParam = !isOptionalParam(param);
      if (isRequiredParam && actualArgs[idx] === undefined) {
        const requiredParamCount = params.filter((p) => !isOptionalParam(p)).length;
        throw new Error(
          `Miss match RPC params, required ${requiredParamCount} params, current inputs length: ${actualArgs.length}`,
        );
      }
    });
  }
}
