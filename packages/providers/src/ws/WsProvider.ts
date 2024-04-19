import { WebSocket } from '@polkadot/x-ws';
import { assert, EventEmitter } from '@dedot/utils';
import { JsonRpcError } from '../error.js';
import {
  ConnectionStatus,
  JsonRpcProvider,
  JsonRpcRequest,
  JsonRpcRequestId,
  JsonRpcResponse,
  JsonRpcResponseNotification,
  ProviderEvent,
  Subscription,
  SubscriptionCallback,
  SubscriptionInput,
} from '../types.js';

export interface WsProviderOptions {
  /**
   * The websocket endpoint to connect to
   *
   * @required
   */
  endpoint: string;
  /**
   * Delay in milliseconds before retrying to connect
   * If the value is <= 0, retry will be disabled
   *
   * @default 2500
   */
  retryDelayMs?: number;
  /**
   * Timeout in milliseconds for the request,
   * an error will be thrown if the request takes longer than this value
   *
   * @default 30000
   */
  timeout?: number;
}

export const DEFAULT_OPTIONS: Partial<WsProviderOptions> = {
  retryDelayMs: 2500,
  timeout: 30_000,
};

export interface WsRequestState {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  request: JsonRpcRequest;
  from: number; // when the request was sent
}

export interface WsSubscriptionState {
  input: SubscriptionInput;
  callback: SubscriptionCallback;
  subscription: Subscription;
}

/**
 * @name WsProvider
 * @description A JSON-RPC provider that connects to a WebSocket endpoint
 * @example
 * ```ts
 * const provider = new WsProvider('wss://rpc.polkadot.io');
 *
 * await provider.connect();
 *
 * // Fetch the genesis hash
 * const genesisHash = await provider.send('chain_getBlockHash', [0]);
 * console.log(genesisHash);
 *
 * // Subscribe to runtimeVersion changes
 * await provider.subscribe(
 *   {
 *     subname: 'chain_newHead',
 *     subscribe: 'chain_subscribeNewHeads',
 *     params: [],
 *     unsubscribe: 'chain_unsubscribeNewHeads',
 *   },
 *   (error, newHead, subscription) => {
 *     console.log('newHead', newHead);
 *   },
 * );
 *
 * await provider.disconnect();
 * ```
 */
export class WsProvider extends EventEmitter<ProviderEvent> implements JsonRpcProvider {
  #status: ConnectionStatus;
  #options: Required<WsProviderOptions>;
  #handlers: Record<JsonRpcRequestId, WsRequestState>;
  #subscriptions: Record<string, WsSubscriptionState>;
  #pendingNotifications: Record<string, JsonRpcResponseNotification>;
  #ws?: WebSocket;
  #timeoutTimer?: ReturnType<typeof setInterval>;

  constructor(options: WsProviderOptions | string) {
    super();

    this.#status = 'disconnected';
    this.#options = this.#normalizeOptions(options);
    this.#handlers = {};
    this.#subscriptions = {};
    this.#pendingNotifications = {};
  }

  async connect(): Promise<this> {
    this.#connectAndRetry();
    return this.#untilConnected();
  }

  #untilConnected = (): Promise<this> => {
    return new Promise((resolve, reject) => {
      const doResolve = () => {
        resolve(this);
        this.off('error', doReject);
      };

      const doReject = (error: Error) => {
        reject(error);
        this.off('connected', doResolve);
      };

      this.once('connected', doResolve);

      // If we are not retrying, reject the promise if an error occurs
      if (!this.#shouldRetry) {
        this.once('error', doReject);
      }
    });
  };

  get #shouldRetry() {
    return this.#options.retryDelayMs > 0;
  }

  #doConnect() {
    assert(!this.#ws, 'Websocket connection already exists');

    try {
      this.#ws = new WebSocket(this.#options.endpoint);
      this.#ws.onopen = this.#onSocketOpen;
      this.#ws.onclose = this.#onSocketClose;
      this.#ws.onmessage = this.#onSocketMessage;
      this.#ws.onerror = this.#onSocketError;

      this.#setupRequestTimeoutHandler();
    } catch (e: any) {
      console.error('Error connecting to websocket', e);
      this.emit('error', e);
      throw e;
    }
  }

  #connectAndRetry() {
    assert(!this.#ws, 'Websocket connection already exists');

    try {
      this.#doConnect();
    } catch (e) {
      if (!this.#shouldRetry) {
        throw e;
      }

      this.#retry();
    }
  }

  #retry() {
    if (!this.#shouldRetry) return;

    setTimeout(() => {
      this.#setStatus('reconnecting');

      this.#connectAndRetry();
    }, this.#options.retryDelayMs);
  }

  #setStatus(status: ConnectionStatus) {
    if (this.#status === status) return;

    this.#status = status;
    this.emit(status);
  }

  #onSocketOpen = async (event: Event) => {
    this.#setStatus('connected');

    // re-subscribe to previous subscriptions if this is a reconnect
    Object.keys(this.#subscriptions).forEach((subkey) => {
      const { input, callback, subscription } = this.#subscriptions[subkey];

      this.subscribe(input, callback).then((newsub) => {
        // Remove the old subscription record
        delete this.#subscriptions[subkey];

        // This is a bit of a hack, but we need to update the subscription object
        // So that the old/prev-unsubscribe method will work correctly
        Object.assign(subscription, newsub);
      });
    });
  };

  #clearWs() {
    if (!this.#ws) return;

    this.#ws.onclose = null;
    this.#ws.onerror = null;
    this.#ws.onmessage = null;
    this.#ws.onopen = null;
    this.#ws = undefined;
  }

  #setupRequestTimeoutHandler() {
    const timeout = this.#options.timeout;
    if (timeout <= 0) return;

    this.#clearTimeoutHandler();

    this.#timeoutTimer = setInterval(() => {
      const now = Date.now();

      Object.values(this.#handlers).forEach(({ from, reject, request }) => {
        if (now - from > timeout) {
          reject(new Error(`Request timed out after ${timeout}ms`));
          delete this.#handlers[request.id];
        }
      });
    }, 5_000);
  }

  #clearTimeoutHandler() {
    if (!this.#timeoutTimer) return;

    clearInterval(this.#timeoutTimer);
    this.#timeoutTimer = undefined;
  }

  #cleanUp() {
    this.#clearWs();
    this.#handlers = {};
    this.#subscriptions = {};
    this.#pendingNotifications = {};
    this.clearEvents();
    this.#clearTimeoutHandler();
  }

  #onSocketClose = (event: CloseEvent) => {
    this.#clearWs();

    const error = new Error(`disconnected from ${this.#options.endpoint}: ${event.code} - ${event.reason}`);

    // Reject all pending requests
    Object.values(this.#handlers).forEach(({ reject }) => {
      reject(error);
    });

    this.#handlers = {};
    this.#pendingNotifications = {};

    this.#setStatus('disconnected');

    // attempt to reconnect if the connection was closed manually (via .disconnect())
    const normalClosure = event.code === 1000;
    if (!normalClosure) {
      console.error(error.message);
      this.#retry();
    }
  };

  #onSocketError = (error: Event) => {
    this.emit('error', error);
  };

  #onSocketMessage = (message: MessageEvent<string>) => {
    const data = JSON.parse(message.data) as any;

    const isNotification = !data.id && data.method;
    if (isNotification) {
      this.#handleNotification(data);
    } else {
      this.#handleResponse(data);
    }
  };

  #handleResponse(response: JsonRpcResponse) {
    const { id, error, result } = response;
    const handler = this.#handlers[id];
    if (!handler) {
      console.error(`Received response with unknown id: ${id}`);
      return;
    }

    const { resolve, reject } = handler;

    if (error) {
      reject(new JsonRpcError(error));
    } else {
      resolve(result);
    }

    delete this.#handlers[id];
  }

  #handleNotification(response: JsonRpcResponseNotification) {
    const { method: subname, params } = response;
    const { subscription: subscriptionId, result, error } = params;

    const subkey = `${subname}::${subscriptionId}`;
    const substate = this.#subscriptions[subkey];

    // TODO check if there is an handler exists for the subscription
    if (!substate) {
      this.#pendingNotifications[subkey] = response;
      return;
    }

    const { callback } = substate;

    if (error) {
      callback(new JsonRpcError(error), null, substate.subscription);
    } else {
      callback(null, result, substate.subscription);
    }
  }

  #normalizeOptions(options: WsProviderOptions | string): Required<WsProviderOptions> {
    const normalizedOptions =
      typeof options === 'string'
        ? {
            ...DEFAULT_OPTIONS,
            endpoint: options,
          }
        : {
            ...DEFAULT_OPTIONS,
            ...options,
          };

    const { endpoint = '' } = normalizedOptions;

    if (!endpoint.startsWith('ws://') && !endpoint.startsWith('wss://')) {
      throw new Error(`Invalid websocket endpoint ${endpoint}, a valid endpoint should start with wss:// or ws://`);
    }

    return normalizedOptions as Required<WsProviderOptions>;
  }

  get status(): ConnectionStatus {
    return this.#status;
  }

  async disconnect(): Promise<void> {
    try {
      assert(this.#ws, 'Websocket connection does not exist');
      // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
      this.#ws.close(1000); // Normal closure
      this.#setStatus('disconnected');
      this.#cleanUp();
    } catch (error: any) {
      console.error('Error disconnecting from websocket', error);
      this.emit('error', error);

      throw error;
    }
  }

  async send<T = any>(method: string, params: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        assert(this.#ws && this.#status === 'connected', 'Websocket connection is not connected');

        const request = this.#prepareRequest(method, params);
        this.#handlers[request.id] = {
          resolve,
          reject,
          request,
          from: Date.now(),
        };

        this.#ws.send(JSON.stringify(request));
      } catch (e) {
        reject(e);
      }
    });
  }

  async subscribe<T = any>(input: SubscriptionInput, callback: SubscriptionCallback<T>): Promise<Subscription> {
    const { subname, subscribe, params, unsubscribe } = input;
    const subscriptionId = await this.send<string>(subscribe, params);

    const subkey = `${subname}::${subscriptionId}`;

    const subscription: Subscription = {
      unsubscribe: async () => {
        delete this.#subscriptions[subkey];
        await this.send(unsubscribe, [subscriptionId]);
      },
      subscriptionId,
    };

    this.#subscriptions[subkey] = {
      input,
      callback,
      subscription,
    };

    // Handle pending notifications
    if (this.#pendingNotifications[subkey]) {
      this.#handleNotification(this.#pendingNotifications[subkey]);
      delete this.#pendingNotifications[subkey];
    }

    return subscription;
  }

  #id: JsonRpcRequestId = 0;
  #prepareRequest(method: string, params: any[]): JsonRpcRequest {
    const id = ++this.#id;

    return {
      id,
      jsonrpc: '2.0',
      method,
      params,
    };
  }
}
