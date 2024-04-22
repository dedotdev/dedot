import { JsonRpcClient } from 'dedot';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import MockProvider from '../../../client/__tests__/MockProvider';
import { IJsonRpcClient } from '../../../types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from '../JsonRpcGroup';

const rpcMethods = ['test_unstable_method', 'test_unstable_anotherMethod'];

describe('JsonRpcGroup', () => {
  let client: IJsonRpcClient;
  let options: JsonRpcGroupOptions;

  beforeEach(() => {
    client = new JsonRpcClient({ provider: new MockProvider() });
    options = {
      prefix: 'test',
      supportedVersions: ['unstable', 'v1'],
      rpcMethods,
    };
  });

  it('should detect version correctly', async () => {
    const group = new JsonRpcGroup(client, options);
    const version = await group.version();
    expect(version).toBe('unstable');
  });

  it('should throw error when detected version is not supported', async () => {
    options.supportedVersions = ['v1'];
    const group = new JsonRpcGroup(client, options);
    await expect(group.version()).rejects.toThrow();
  });

  it('should return true when group is supported', async () => {
    const group = new JsonRpcGroup(client, options);
    const isSupported = await group.supported();
    expect(isSupported).toBe(true);
  });

  it('should return false when group is not supported', async () => {
    options.supportedVersions = ['v1'];
    const group = new JsonRpcGroup(client, options);
    const isSupported = await group.supported();
    expect(isSupported).toBe(false);
  });

  it('should send json-rpc request correctly', async () => {
    (client.provider as MockProvider).setRpcRequest('test_unstable_method', () => '0x');
    const providerSend = vi.spyOn(client.provider, 'send');

    const group = new JsonRpcGroup(client, options);
    await group.send('method', 'param1', 'param2');

    expect(providerSend).toBeCalledWith('test_unstable_method', ['param1', 'param2']);
  });

  it('should send request using the fixed version', async () => {
    (client.provider as MockProvider).setRpcRequest('test_v1_method', () => {
      throw new Error('Method not found');
    });

    options.fixedVersion = 'v1';
    options.supportedVersions = undefined;

    const providerSend = vi.spyOn(client.provider, 'send');

    const group = new JsonRpcGroup(client, options);
    await expect(group.send('method', 'param1', 'param2')).rejects.toThrow();

    expect(providerSend).toBeCalledWith('test_v1_method', ['param1', 'param2']);
  });
});
