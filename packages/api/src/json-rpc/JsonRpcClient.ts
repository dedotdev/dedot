import type { ConnectionStatus, JsonRpcProvider, ProviderEvent, JsonRpcSubscription } from '@dedot/providers';
import type { AsyncMethod, GenericSubstrateApi, RpcVersion, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import { assert, EventEmitter, isFunction, isString } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import type { IJsonRpcClient, JsonRpcClientOptions } from '../types.js';
import { scaledResponses } from './scaledResponses.js';
import { subscriptionsInfo } from './subscriptionsInfo.js';

export const isJsonRpcProvider = (provider: any): provider is JsonRpcProvider => {
  return (
    provider &&
    isString(provider.status) &&
    isFunction(provider.send) &&
    isFunction(provider.subscribe) &&
    isFunction(provider.connect) &&
    isFunction(provider.disconnect)
  );
};

export class JsonRpcClient<
    ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // prettier-end-here
    Events extends string = ProviderEvent,
  >
  extends EventEmitter<Events>
  implements IJsonRpcClient<ChainApi[RpcVersion], Events>
{
  readonly #options: JsonRpcClientOptions;
  readonly #provider: JsonRpcProvider;

  constructor(options: JsonRpcClientOptions | JsonRpcProvider) {
    super();

    if (isJsonRpcProvider(options)) {
      this.#options = { provider: options };
      this.#provider = options;
    } else {
      this.#options = options;
      this.#provider = options.provider;
    }

    assert(this.#provider, 'A JsonRpcProvider is required');
  }

  /**
   * Factory method to create a new JsonRpcClient instance
   *
   * @param options
   */
  static async create<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: JsonRpcClientOptions | JsonRpcProvider,
  ): Promise<JsonRpcClient<ChainApi>> {
    return new JsonRpcClient<ChainApi>(options).connect();
  }

  /**
   * Alias for __JsonRpcClient.create__
   *
   * @param options
   */
  static async new<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi>(
    options: JsonRpcClientOptions | JsonRpcProvider,
  ): Promise<JsonRpcClient<ChainApi>> {
    return JsonRpcClient.create(options);
  }

  get options(): JsonRpcClientOptions {
    return this.#options;
  }

  /**
   * @description Check connection status of the api instance
   */
  get status(): ConnectionStatus {
    return this.provider.status;
  }

  /**
   * @description Get the JSON-RPC provider instance
   */
  get provider(): JsonRpcProvider {
    return this.#provider;
  }

  connect(): Promise<this> {
    return this.#doConnect();
  }

  async #doConnect(): Promise<this> {
    this.provider.on('connected', this.#onConnected);
    this.provider.on('disconnected', this.#onDisconnected);
    this.provider.on('reconnecting', this.#onReconnecting);
    this.provider.on('error', this.#onError);

    return new Promise<this>((resolve, reject) => {
      // @ts-ignore
      this.once('connected', () => {
        resolve(this);
      });

      if (this.status === 'connected') {
        this.#onConnected().catch(reject);
      } else {
        this.provider.connect().catch(reject);
      }
    });
  }

  #onConnected = async () => {
    // @ts-ignore
    this.emit('connected');
  };

  #onDisconnected = async () => {
    // @ts-ignore
    this.emit('disconnected');
  };

  #onReconnecting = async () => {
    // @ts-ignore
    this.emit('reconnecting');
  };

  #onError = async (e: Error) => {
    // @ts-ignore
    this.emit('error', e);
  };

  async disconnect(): Promise<void> {
    await this.#provider.disconnect();
    this.clearEvents();
  }

  /**
   * @description Entry-point for executing JSON-RPCs to blockchain node.
   *
   * ```typescript
   * const client = new JsonRpcClient('wss://rpc.polkadot.io');
   * await client.connect();
   *
   * // Subscribe to new heads
   * client.rpc.chain_subscribeNewHeads((header) => {
   *   console.log(header);
   * });
   *
   * // Execute arbitrary rpc method: `module_rpc_name`
   * const result = await client.rpc.module_rpc_name();
   * ```
   */
  get rpc(): ChainApi[RpcVersion]['rpc'] {
    return new Proxy<JsonRpcClient<ChainApi, Events>>(this, {
      get(target, property: string | symbol, receiver: any): any {
        const rpcMethod = property.toString();

        return target.#doExecute(rpcMethod);
      },
    }) as unknown as ChainApi[RpcVersion]['rpc'];
  }

  #doExecute(rpcName: string): AsyncMethod {
    const subscriptionInfo = this.options.subscriptions?.[rpcName] || subscriptionsInfo[rpcName];
    const isSubscription = !!subscriptionInfo;

    const fnRpc = async (...args: any[]): Promise<any> => {
      const result = await this.provider.send<any>(rpcName, args);

      return this.#tryDecode(rpcName, result);
    };

    const fnSubRpc = async (...args: any[]): Promise<Unsub> => {
      const inArgs = args.slice();
      const callback = inArgs.pop();
      assert(isFunction(callback), 'A callback is required for subscription');

      const onNewMessage = (error: Error | null, result: unknown, subscription: JsonRpcSubscription) => {
        if (error) {
          console.error(error);
          return;
        }

        callback(this.#tryDecode(rpcName, result), subscription);
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

  #tryDecode(rpcName: string, raw: any) {
    if (raw === null) {
      // We use `undefined` to represent Option::None in the client
      return undefined;
    }

    const $maybeCodec = this.options.scaledResponses?.[rpcName] || scaledResponses[rpcName];

    if ($maybeCodec) {
      return $maybeCodec.tryDecode(raw);
    }

    return raw;
  }
}
