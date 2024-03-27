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
} from './types';
import { assert, EventEmitter } from '@dedot/utils';
import { WebSocket } from '@polkadot/x-ws';

export interface WsProviderOptions {
  endpoint: string;
  retryDelayMs?: number;
  timeout?: number;
}

export const DEFAULT_OPTIONS: Partial<WsProviderOptions> = {
  retryDelayMs: 2_5000,
  timeout: 60_000,
};

export type SubscriptionHandler = {
  input: SubscriptionInput;
  callback: SubscriptionCallback;
};

export interface WsRequestState {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  request: JsonRpcRequest;
  subscription?: SubscriptionHandler;
}

export interface SubscriptionState {
  input: SubscriptionInput;
  callback: SubscriptionCallback;
  subscription: Subscription;
}

export class WsProvider extends EventEmitter<ProviderEvent> implements JsonRpcProvider {
  #status: ConnectionStatus;
  #options: Required<WsProviderOptions>;
  #handlers: Record<JsonRpcRequestId, WsRequestState>;
  #subscriptions: Record<string, SubscriptionState>;
  #pendingNotifications: Record<string, JsonRpcResponseNotification>;
  #ws?: WebSocket;
  #ready: Promise<void>;

  constructor(options: WsProviderOptions | string) {
    super();

    this.#status = 'disconnected';
    this.#options = this.#normalizeOptions(options);
    this.#handlers = {};
    this.#subscriptions = {};
    this.#pendingNotifications = {};

    this.#ready = new Promise((resolve) => {
      this.once('connected', resolve);
    });

    this.#connectAndRetry();
  }

  untilReady(): Promise<void> {
    return this.#ready;
  }

  #connect() {
    try {
      this.#ws = new WebSocket(this.#options.endpoint);
      this.#ws.onopen = this.#onSocketOpen;
      this.#ws.onclose = this.#onSocketClose;
      this.#ws.onmessage = this.#onSocketMessage;
      this.#ws.onerror = this.#onSocketError;
    } catch (e: any) {
      console.error('Error connecting to websocket', e);
      this.emit('error', e);
      throw e;
    }
  }

  #connectAndRetry() {
    try {
      this.#connect();
    } catch (e) {
      this.#retry();
    }
  }

  #retry() {
    if (this.#options.retryDelayMs <= 0) return;

    setTimeout(() => {
      this.#status = 'reconnecting';
      this.emit('reconnecting');

      this.#connectAndRetry();
    }, this.#options.retryDelayMs);
  }

  #onSocketOpen = (event: Event) => {
    // TODO resubcribe to previous subscriptions if this is a reconnect

    this.#status = 'connected';
    this.emit('connected');
  };

  #onSocketClose = (event: CloseEvent) => {
    if (this.#ws) {
      this.#ws.onclose = null;
      this.#ws.onerror = null;
      this.#ws.onmessage = null;
      this.#ws.onopen = null;
      this.#ws = undefined;
    }

    this.#status = 'disconnected';
    this.emit('disconnected');

    // TODO retry connect
    this.#retry();
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
    const { resolve, reject } = handler;

    if (error) {
      reject(new Error(`${error.code}: ${error.message}`));
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
    if (!substate) {
      this.#pendingNotifications[subkey] = response;
      return;
    }

    const { callback } = substate;

    if (error) {
      callback(new Error(`${error.code}: ${error.message}`), null, substate.subscription);
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
      this.#ws?.close(1000);
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

        const [id, request] = this.#prepareRequest(method, params);
        this.#handlers[id] = {
          resolve,
          reject,
          request,
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
  #prepareRequest(method: string, params: any[]): [JsonRpcRequestId, JsonRpcRequest] {
    const id = ++this.#id;

    return [
      id,
      {
        id,
        jsonrpc: '2.0',
        method,
        params,
      },
    ];
  }
}
