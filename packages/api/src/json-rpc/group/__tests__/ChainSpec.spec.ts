import { stringToHex } from '@dedot/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MockProvider from '../../../client/__tests__/MockProvider.js';
import { IJsonRpcClient } from '../../../public-types.js';
import { JsonRpcClient } from '../../JsonRpcClient.js';
import { ChainSpec } from '../ChainSpec.js';

const rpcMethods = ['chainSpec_v1_chainName', 'chainSpec_v1_genesisHash', 'chainSpec_v1_properties'];

describe('ChainSpec', () => {
  let provider: MockProvider;
  let client: IJsonRpcClient;

  beforeEach(() => {
    provider = new MockProvider();
    provider.setRpcRequests({
      rpc_methods: () => ({ methods: rpcMethods }),
      chainSpec_v1_chainName: () => 'Mocked chain name',
      chainSpec_v1_genesisHash: () => stringToHex('DEDOT'),
      chainSpec_v1_properties: () => ({
        ss58Format: 42,
        tokenDecimals: 12,
        tokenSymbol: 'DOT',
      }),
    });

    client = new JsonRpcClient({ provider });
  });

  it('should return chainName', async () => {
    const providerSend = vi.spyOn(client.provider, 'send');
    const chainSpec = new ChainSpec(client);
    const chainName = await chainSpec.chainName();
    expect(chainName).toBe('Mocked chain name');
    expect(providerSend).toBeCalledWith('chainSpec_v1_chainName', []);
  });

  it('should return genesisHash', async () => {
    const providerSend = vi.spyOn(client.provider, 'send');
    const chainSpec = new ChainSpec(client);
    const genesisHash = await chainSpec.genesisHash();
    expect(genesisHash).toBe(stringToHex('DEDOT'));
    expect(providerSend).toBeCalledWith('chainSpec_v1_genesisHash', []);
  });

  it('should return properties', async () => {
    const providerSend = vi.spyOn(client.provider, 'send');
    const chainSpec = new ChainSpec(client);
    const properties = await chainSpec.properties();
    expect(properties).toEqual({
      ss58Format: 42,
      tokenDecimals: 12,
      tokenSymbol: 'DOT',
    });
    expect(providerSend).toBeCalledWith('chainSpec_v1_properties', []);
  });
});
