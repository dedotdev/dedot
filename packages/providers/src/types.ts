import type { IEventEmitter } from '@dedot/utils';

export * from './json-rpc.js';

export type Subscription = {
  unsubscribe: () => Promise<void>;
  subscriptionId: string;
};

export type SubscriptionCallback<T = any> = (error: Error | null, result: T | null, subscription: Subscription) => void;
export type SubscriptionInput = {
  /**
   * Subscription/notification name, this value should be present in the notification response from the server/node
   */
  subname: string;
  /**
   * Subscribe method
   */
  subscribe: string;
  /**
   * Subscribe parameters
   */
  params: any[];
  /**
   * Unsubscribe method
   */
  unsubscribe: string;
};

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type ProviderEvent = ConnectionStatus | 'error'; // | 'timeout';

export interface JsonRpcProvider extends IEventEmitter<ProviderEvent> {
  /**
   * The current connection status
   */
  status: ConnectionStatus;

  /**
   * Send a JSON-RPC request,
   * make sure to connect to the provider first before sending requests
   *
   * @param method
   * @param params
   */
  send<T = any>(method: string, params: any[]): Promise<T>;

  /**
   * Make a subscription request,
   * make sure to connect to the provider first before sending requests
   *
   * @param input
   * @param callback
   */
  subscribe<T = any>(input: SubscriptionInput, callback: SubscriptionCallback<T>): Promise<Subscription>;

  /**
   * Connect to the provider
   */
  connect(): Promise<this>;

  /**
   * Disconnect from the provider
   */
  disconnect(): Promise<void>;
}
