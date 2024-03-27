import { EventEmitter } from '@dedot/utils';

export * from './json-rpc';

export type Subscription = {
  unsubscribe: () => Promise<void>;
  subscriptionId: string;
};

export type SubscriptionCallback<T = any> = (error: Error | null, result: T | null, subscription: Subscription) => void;
export type SubscriptionInput = {
  subname: string;
  subscribe: string;
  params: any[];
  unsubscribe: string;
};

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type ProviderEvent = ConnectionStatus | 'error';

export interface JsonRpcProvider extends EventEmitter<ProviderEvent> {
  status: ConnectionStatus;
  send<T = any>(method: string, params: any[]): Promise<T>;
  subscribe<T = any>(input: SubscriptionInput, callback: SubscriptionCallback<T>): Promise<Subscription>;
  disconnect(): Promise<void>;
}
