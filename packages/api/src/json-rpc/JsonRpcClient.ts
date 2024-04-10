import { AsyncMethod, GenericSubstrateApi, Unsub } from '@dedot/types';
import { IJsonRpcClient, JsonRpcClientOptions, NetworkEndpoint } from '../types.js';
import { SubstrateApi } from '../chaintypes/index.js';
import { assert, EventEmitter, isFunction } from '@dedot/utils';
import { ConnectionStatus, JsonRpcProvider, ProviderEvent, Subscription, WsProvider } from '@dedot/providers';
import { scaledResponses, subscriptionsInfo } from '@dedot/specs';

export class JsonRpcClient<ChainApi extends GenericSubstrateApi = SubstrateApi, Events extends string = ProviderEvent>
  extends EventEmitter<Events>
  implements IJsonRpcClient<ChainApi, Events>
{
  readonly #options: JsonRpcClientOptions;
  readonly #provider: JsonRpcProvider;

  constructor(options: JsonRpcClientOptions | NetworkEndpoint) {
    super();

    this.#options = typeof options === 'string' ? { endpoint: options } : options;
    this.#provider = this.#getProvider();
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
  }

  #getProvider(): JsonRpcProvider {
    const { provider, endpoint } = this.#options;
    if (provider) return provider;
    if (endpoint) return new WsProvider(endpoint);

    // TODO support light-client
    return new WsProvider('ws://127.0.0.1:9944');
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
  get rpc(): ChainApi['rpc'] {
    return new Proxy<JsonRpcClient<ChainApi, Events>>(this, {
      get(target, property: string | symbol, receiver: any): any {
        const rpcMethod = property.toString();

        return target.#doExecute(rpcMethod);
      },
    }) as unknown as ChainApi['rpc'];
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

      const onNewMessage = (error: Error | null, result: unknown, subscription: Subscription) => {
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
