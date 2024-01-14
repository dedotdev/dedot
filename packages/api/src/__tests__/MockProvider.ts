import {
  ProviderInterface,
  ProviderInterfaceCallback,
  ProviderInterfaceEmitCb,
  ProviderInterfaceEmitted,
} from '@polkadot/rpc-provider/types';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';
import { AnyFunc, ChainProperties, RuntimeVersion } from '@delightfuldot/types';

const MOCK_APIS = [
  // Metadata
  ['0x37e397fc7c91f5e4', 2],
];

export default class MockProvider implements ProviderInterface {
  rpcRequests: Record<string, AnyFunc> = {
    chain_getBlockHash: () => '0x0000000000000000000000000000000000000000000000000000000000000000',
    state_getRuntimeVersion: () =>
      ({ specVersion: 1, specName: 'MockedSpec', apis: MOCK_APIS }) as unknown as RuntimeVersion,
    system_chain: () => 'MockedChain',
    system_properties: () => ({ ss58Format: 42 }) as ChainProperties,
    state_getMetadata: () => staticSubstrate,
    state_call: () => [],
  };

  connect(): Promise<void> {
    return Promise.resolve(undefined);
  }

  disconnect(): Promise<void> {
    return Promise.resolve(undefined);
  }

  on(type: ProviderInterfaceEmitted, sub: ProviderInterfaceEmitCb): () => void {
    return function () {};
  }

  async send<T = any>(method: string, params: unknown[], isCacheable?: boolean): Promise<T> {
    const result = this.rpcRequests[method];
    if (!result) {
      throw new Error(`${method} not implemented`);
    }

    return result(params) as T;
  }

  async subscribe(
    type: string,
    method: string,
    params: unknown[],
    cb: ProviderInterfaceCallback,
  ): Promise<number | string> {
    return 1;
  }

  async unsubscribe(type: string, method: string, id: number | string): Promise<boolean> {
    return Promise.resolve(false);
  }

  setRpcRequest(name: string, response: AnyFunc) {
    this.rpcRequests[name] = response;
  }

  get hasSubscriptions() {
    return true;
  }
  get isClonable(): boolean {
    throw new Error('Not supported');
  }
  get isConnected() {
    return true;
  }

  clone(): ProviderInterface {
    throw new Error('Not supported');
  }
}
