import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { RuntimeVersion } from '@dedot/codecs';
import {
  ConnectionStatus,
  JsonRpcProvider,
  ProviderEvent,
  Subscription,
  SubscriptionCallback,
  SubscriptionInput,
} from '@dedot/providers';
import { AnyFunc } from '@dedot/types';
import { ChainProperties } from '@dedot/types/json-rpc';
import { EventEmitter } from '@dedot/utils';
import { FallbackRuntimeApis } from '../../executor/RuntimeApiExecutor.js';

export const MockedRuntimeVersion: RuntimeVersion = {
  specName: 'mock-spec',
  implName: 'mock-spec-impl',
  authoringVersion: 0,
  specVersion: 1,
  implVersion: 0,
  // @ts-ignore
  apis: [...Object.entries(FallbackRuntimeApis)],
  transactionVersion: 25,
  stateVersion: 0,
};

export default class MockProvider extends EventEmitter<ProviderEvent> implements JsonRpcProvider {
  #status: ConnectionStatus = 'disconnected';

  rpcRequests: Record<string, AnyFunc>;

  constructor(mockedRuntimeVersion: RuntimeVersion = MockedRuntimeVersion) {
    super();
    this.rpcRequests = {
      chain_getBlockHash: () => '0x0000000000000000000000000000000000000000000000000000000000000000',
      state_getRuntimeVersion: () => mockedRuntimeVersion,
      state_subscribeRuntimeVersion: () => 'runtime-version-subscription-id',
      state_unsubscribeRuntimeVersion: () => null,
      system_chain: () => 'MockedChain',
      system_properties: () => ({ ss58Format: 42 }) as ChainProperties,
      state_getMetadata: () => staticSubstrateV15,
      state_call: () => '0x',
      state_getStorage: () => '0x',
      state_queryStorageAt: () => [{ block: '0x', changes: ['0x', '0x'] }],
    };
  }

  #subscriptions: Record<
    string,
    {
      callback: SubscriptionCallback;
      subscription: Subscription;
    }
  > = {};

  setStatus(status: ConnectionStatus) {
    this.#status = status;
    this.emit(status);
  }

  connect(): Promise<this> {
    this.setStatus('connected');
    return Promise.resolve(this);
  }

  disconnect(): Promise<void> {
    this.setStatus('disconnected');
    return Promise.resolve(undefined);
  }

  async send<T = any>(method: string, params: unknown[]): Promise<T> {
    const result = this.rpcRequests[method];
    if (!result) {
      throw new Error(`${method} not implemented`);
    }

    return (await result(params)) as T;
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

    this.#subscriptions[subscriptionId] = { callback, subscription };

    return subscription;
  }

  notify(subscriptionId: string, data: Error | any) {
    const { callback, subscription } = this.#subscriptions[subscriptionId];
    if (callback) {
      if (data instanceof Error) {
        callback(data, undefined, subscription);
      } else {
        callback(null, data, subscription);
      }
    }
  }

  setRpcRequest(name: string, response: AnyFunc) {
    this.rpcRequests[name] = response;
  }

  setRpcRequests(requests: Record<string, AnyFunc>) {
    this.rpcRequests = {
      ...this.rpcRequests,
      ...requests,
    };
  }

  get status(): ConnectionStatus {
    return this.#status;
  }
}
