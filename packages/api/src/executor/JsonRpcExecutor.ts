import type { SubstrateApi } from '@dedot/chaintypes';
import { scaleResponses, subscriptionsInfo } from '@dedot/specs';
import { AsyncMethod, GenericSubstrateApi, Unsub } from '@dedot/types';
import { assert, isFunction } from '@dedot/utils';
import { Executor } from './Executor.js';

/**
 * @name JsonRpcExecutor
 */
export class JsonRpcExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  doExecute(rpcName: string): AsyncMethod {
    const subscriptionInfo = subscriptionsInfo[rpcName] || this.api.options.subscriptions?.[rpcName];
    const isSubscription = !!subscriptionInfo;

    const fnRpc = async (...args: any[]): Promise<any> => {
      const result = await this.provider.send<any>(rpcName, args);

      return this.tryDecode(rpcName, result);
    };

    const fnSubRpc = async (...args: any[]): Promise<Unsub> => {
      const inArgs = args.slice();
      const callback = inArgs.pop();
      assert(isFunction(callback), 'A callback is required for subscription');

      const onNewMessage = (error?: Error | null, result?: unknown) => {
        if (error) {
          console.error(error);
          return;
        }

        callback(this.tryDecode(rpcName, result));
      };

      const [subname, unsubscribe] = subscriptionInfo;

      const subscription = await this.provider.subscribe(
        { subname, subscribe: rpcName, params: inArgs, unsubscribe },
        onNewMessage,
      );

      return async () => {
        await subscription.unsubscribe();
      };
    };

    return isSubscription ? fnSubRpc : fnRpc;
  }

  tryDecode(rpcName: string, raw: any) {
    if (raw === null) {
      // We use `undefined` to represent Option::None in the client
      return undefined;
    }

    const $maybeCodec = scaleResponses[rpcName];

    if ($maybeCodec) {
      return $maybeCodec.tryDecode(raw);
    }

    return raw;
  }
}
