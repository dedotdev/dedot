import {
  ProviderInterface,
  ProviderInterfaceCallback,
  ProviderInterfaceEmitCb,
  ProviderInterfaceEmitted,
} from '@polkadot/rpc-provider/types';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';
import { ChainProperties, RuntimeVersion } from '@delightfuldot/types';

const rpcRequests: Record<string, (...args: any[]) => any> = {
  chain_getBlockHash: () => '0x0000000000000000000000000000000000000000000000000000000000000000',
  state_getRuntimeVersion: () => ({ specVersion: 1, specName: 'MockedSpec' }) as RuntimeVersion,
  system_chain: () => 'MockedChain',
  system_properties: () => ({ ss58Format: 42 }) as ChainProperties,
  state_getMetadata: () => staticSubstrate,
};

export default class MockProvider implements ProviderInterface {
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
    const result = rpcRequests[method];
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
