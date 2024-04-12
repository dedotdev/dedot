import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';
import { AnyFunc } from '@dedot/types';
import { ChainProperties } from '@dedot/specs';
import { RuntimeVersion } from '@dedot/codecs';
import {
  ConnectionStatus,
  JsonRpcProvider,
  ProviderEvent,
  Subscription,
  SubscriptionCallback,
  SubscriptionInput,
} from '@dedot/providers';
import { EventEmitter } from '@dedot/utils';

export const MockedRuntimeVersion: RuntimeVersion = {
  specName: 'mock-spec',
  implName: 'mock-spec-impl',
  authoringVersion: 0,
  specVersion: 1,
  implVersion: 0,
  apis: [],
  transactionVersion: 25,
  stateVersion: 0,
};

export default class MockProvider extends EventEmitter<ProviderEvent> implements JsonRpcProvider {
  #status: ConnectionStatus = 'disconnected';

  rpcRequests: Record<string, AnyFunc> = {
    chain_getBlockHash: () => '0x0000000000000000000000000000000000000000000000000000000000000000',
    state_getRuntimeVersion: () => MockedRuntimeVersion,
    system_chain: () => 'MockedChain',
    system_properties: () => ({ ss58Format: 42 }) as ChainProperties,
    state_getMetadata: () => staticSubstrate,
    state_call: () => '0x',
  };

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

  async send<T = any>(method: string, params: unknown[], isCacheable?: boolean): Promise<T> {
    const result = this.rpcRequests[method];
    if (!result) {
      throw new Error(`${method} not implemented`);
    }

    return result(params) as T;
  }

  async subscribe<T = any>(input: SubscriptionInput, callback: SubscriptionCallback<T>): Promise<Subscription> {
    return {
      unsubscribe: async () => {},
      subscriptionId: Math.random().toString(36).substring(2),
    };
  }

  setRpcRequest(name: string, response: AnyFunc) {
    this.rpcRequests[name] = response;
  }

  get status(): ConnectionStatus {
    return this.#status;
  }
}
