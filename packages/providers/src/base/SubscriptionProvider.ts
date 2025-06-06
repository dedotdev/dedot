import { deferred, Deferred, EventEmitter, isHex, shortenAddress } from '@dedot/utils';
import { JsonRpcError } from '../error.js';
import {
  ConnectionStatus,
  JsonRpcProvider,
  JsonRpcRequest,
  JsonRpcRequestId,
  JsonRpcResponse,
  JsonRpcResponseNotification,
  ProviderEvent,
  JsonRpcSubscription,
  JsonRpcSubscriptionCallback,
  JsonRpcSubscriptionInput,
} from '../types.js';

interface RequestState<T = any> {
  defer: Deferred<T>;
  request: JsonRpcRequest;
  from: number; // when the request was sent
}

interface SubscriptionState {
  input: JsonRpcSubscriptionInput;
  callback: JsonRpcSubscriptionCallback;
  subscription: JsonRpcSubscription;
}

/**
 * @name SubscriptionProvider
 * @description
 * A base class for providers that support subscriptions (e.g: Websocket, Smoldot)
 */
export abstract class SubscriptionProvider extends EventEmitter<ProviderEvent> implements JsonRpcProvider {
  protected _status: ConnectionStatus;
  protected _handlers: Record<JsonRpcRequestId, RequestState>;
  protected _subscriptions: Record<string, SubscriptionState>;
  protected _pendingNotifications: Record<string, JsonRpcResponseNotification[]>;

  protected constructor() {
    super();

    this._status = 'disconnected';
    this._handlers = {};
    this._subscriptions = {};
    this._pendingNotifications = {};
  }

  connect(): Promise<this> {
    throw new Error('Unimplemented!');
  }

  disconnect(): Promise<void> {
    throw new Error('Unimplemented!');
  }

  protected async doSend(request: JsonRpcRequest) {
    throw new Error('Unimplemented!');
  }

  protected _setStatus(status: ConnectionStatus, ...args: any[]) {
    if (this._status === status) return;

    this._status = status;
    this.emit(status, ...args);
  }

  protected _cleanUp() {
    this._handlers = {};
    this._subscriptions = {};
    this._pendingNotifications = {};
    this.clearEvents();
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  protected _onReceiveResponse = (response: string) => {
    const data = JSON.parse(response) as any;

    const isNotification = !data.id && data.method;
    if (isNotification) {
      this._handleNotification(data);
    } else {
      this._handleResponse(data);
    }
  };

  protected _handleResponse(response: JsonRpcResponse) {
    const { id, error, result } = response;
    const handler = this._handlers[id];
    if (!handler) {
      console.error(`Received response with unknown id: ${id}`);
      return;
    }

    const { defer } = handler;

    if (error) {
      defer.reject(new JsonRpcError(error));
    } else {
      defer.resolve(result);
    }

    delete this._handlers[id];
  }

  _handleNotification(response: JsonRpcResponseNotification) {
    const { method: subname, params } = response;
    const { subscription: subscriptionId, result, error } = params;

    const subkey = `${subname}::${subscriptionId}`;
    const substate = this._subscriptions[subkey];

    // TODO check if there is an handler exists for the subscription
    // TODO track if the subkey was existed before and has already been canceled
    //      we'll ignore those pending notifications
    if (!substate) {
      if (!this._pendingNotifications[subkey]) {
        this._pendingNotifications[subkey] = [];
      }

      this._pendingNotifications[subkey].push(response);
      return;
    }

    const { callback } = substate;

    if (error) {
      callback(new JsonRpcError(error), null, substate.subscription);
    } else {
      callback(null, result, substate.subscription);
    }
  }

  async send<T = any>(method: string, params: any[]): Promise<T> {
    const defer = deferred<T>();
    try {
      const request = this.#prepareRequest(method, params);
      this._handlers[request.id] = {
        defer,
        request,
        from: Date.now(),
      };

      await this.doSend(request);
    } catch (e: any) {
      defer.reject(e);
    }

    return defer.promise;
  }

  async subscribe<T = any>(
    input: JsonRpcSubscriptionInput,
    callback: JsonRpcSubscriptionCallback<T>,
  ): Promise<JsonRpcSubscription> {
    const { subname, subscribe, params, unsubscribe } = input;
    const subscriptionId = await this.send<string>(subscribe, params);

    const subkey = `${subname}::${subscriptionId}`;

    const subscription: JsonRpcSubscription = {
      unsubscribe: async () => {
        delete this._subscriptions[subkey];
        await this.send(unsubscribe, [subscriptionId]);
      },
      subscriptionId,
    };

    this._subscriptions[subkey] = {
      input,
      callback,
      subscription,
    };

    // Handle pending notifications
    if (this._pendingNotifications[subkey]) {
      this._pendingNotifications[subkey].forEach((notification) => {
        this._handleNotification(notification);
      });

      delete this._pendingNotifications[subkey];
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
