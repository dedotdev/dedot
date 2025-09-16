import { DedotError, stringToHex } from '@dedot/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MockProvider from '../../../client/__tests__/MockProvider.js';
import { IJsonRpcClient } from '../../../types.js';
import { JsonRpcClient } from '../../JsonRpcClient.js';
import { Archive } from '../Archive.js';

const rpcMethods = [
  'archive_v1_body',
  'archive_v1_genesisHash',
  'archive_v1_header',
  'archive_v1_finalizedHeight',
  'archive_v1_hashByHeight',
  'archive_v1_call',
  'archive_v1_storage',
  'archive_v1_storageDiff',
  'archive_v1_stopStorage',
  'archive_v1_stopStorageDiff',
];

const mockGenesisHash = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';
const mockBlockHash = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
const mockBlockHeader = '0x' + '00'.repeat(100); // Mock encoded header
const mockTxHash = '0x' + 'ab'.repeat(32);

describe('Archive', () => {
  let provider: MockProvider;
  let client: IJsonRpcClient;

  beforeEach(() => {
    provider = new MockProvider();
    provider.setRpcRequests({
      rpc_methods: () => ({ methods: rpcMethods }),
      archive_v1_body: () => [mockTxHash],
      archive_v1_genesisHash: () => mockGenesisHash,
      archive_v1_header: () => mockBlockHeader,
      archive_v1_finalizedHeight: () => 1000,
      archive_v1_hashByHeight: () => [mockBlockHash],
      archive_v1_call: () => ({ success: true, value: '0x1234' }),
      archive_v1_storage: () => 'storage_subscription_123',
      archive_v1_storageDiff: () => 'operation_123',
      archive_v1_stopStorage: () => undefined,
      archive_v1_stopStorageDiff: () => undefined,
    });

    client = new JsonRpcClient({ provider });
  });

  describe('body', () => {
    it('should return block body', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const body = await archive.body(mockBlockHash);

      expect(body).toEqual([mockTxHash]);
      expect(providerSend).toBeCalledWith('archive_v1_body', [mockBlockHash]);
    });

    it('should use finalized hash when no hash provided', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const body = await archive.body();

      expect(body).toEqual([mockTxHash]);
      // Should call finalizedHeight, hashByHeight, then body
      expect(providerSend).toHaveBeenCalledWith('archive_v1_finalizedHeight', []);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_hashByHeight', [1000]);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_body', [mockBlockHash]);
    });

    it('should return undefined for non-existent block', async () => {
      // Create a new provider for this test
      const testProvider = new MockProvider();
      testProvider.setRpcRequests({
        rpc_methods: () => ({ methods: rpcMethods }),
        archive_v1_body: () => null,
      });
      const testClient = new JsonRpcClient({ provider: testProvider });

      const archive = new Archive(testClient);
      const body = await archive.body('0xnonexistent');

      // JsonRpcClient converts null to undefined to represent Option::None
      expect(body).toBeUndefined();
    });

    it('should cache body results', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call
      const body1 = await archive.body(mockBlockHash);
      // Second call with same hash
      const body2 = await archive.body(mockBlockHash);

      expect(body1).toEqual([mockTxHash]);
      expect(body2).toEqual([mockTxHash]);
      expect(body1).toBe(body2); // Should be the same reference (cached)

      // Should only call archive_v1_body once
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_body').length).toBe(1);
    });

    it('should not use cache for different block hashes', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const anotherBlockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // First call with mockBlockHash
      const body1 = await archive.body(mockBlockHash);
      // Second call with different hash
      const body2 = await archive.body(anotherBlockHash);

      expect(body1).toEqual([mockTxHash]);
      expect(body2).toEqual([mockTxHash]);

      // Should call archive_v1_body twice with different hashes
      expect(providerSend).toHaveBeenCalledWith('archive_v1_body', [mockBlockHash]);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_body', [anotherBlockHash]);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_body').length).toBe(2);
    });

    it('should clear body cache when clearCache is called', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call
      await archive.body(mockBlockHash);
      // Clear cache
      archive.clearCache();
      // Second call with same hash after clearing cache
      await archive.body(mockBlockHash);

      // Should call archive_v1_body twice because cache was cleared
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_body').length).toBe(2);
    });
  });

  describe('genesisHash', () => {
    it('should return genesis hash', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const genesisHash = await archive.genesisHash();

      expect(genesisHash).toBe(mockGenesisHash);
      expect(providerSend).toBeCalledWith('archive_v1_genesisHash', []);
    });

    it('should cache genesis hash', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      const hash1 = await archive.genesisHash();
      const hash2 = await archive.genesisHash();

      expect(hash1).toBe(hash2);
      // First call is for rpc_methods, second is for genesisHash
      expect(providerSend).toHaveBeenCalledWith('archive_v1_genesisHash', []);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_genesisHash').length).toBe(1);
    });
  });

  describe('header', () => {
    it('should return block header', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const header = await archive.header(mockBlockHash);

      expect(header).toBe(mockBlockHeader);
      expect(providerSend).toBeCalledWith('archive_v1_header', [mockBlockHash]);
    });

    it('should use finalized hash when no hash provided', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const header = await archive.header();

      expect(header).toBe(mockBlockHeader);
      // Should call finalizedHeight, hashByHeight, then header
      expect(providerSend).toHaveBeenCalledWith('archive_v1_finalizedHeight', []);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_hashByHeight', [1000]);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_header', [mockBlockHash]);
    });

    it('should cache header results', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call
      const header1 = await archive.header(mockBlockHash);
      // Second call with same hash
      const header2 = await archive.header(mockBlockHash);

      expect(header1).toBe(mockBlockHeader);
      expect(header2).toBe(mockBlockHeader);
      expect(header1).toBe(header2); // Should be the same reference (cached)

      // Should only call archive_v1_header once
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_header').length).toBe(1);
    });

    it('should not use cache for different block hashes', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const anotherBlockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const anotherBlockHeader = '0x' + 'ff'.repeat(100);

      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_header: (params: any) => {
          if (params[0] === anotherBlockHash) {
            return anotherBlockHeader;
          }
          return mockBlockHeader;
        },
      });

      // First call with mockBlockHash
      const header1 = await archive.header(mockBlockHash);
      // Second call with different hash
      const header2 = await archive.header(anotherBlockHash);

      expect(header1).toBe(mockBlockHeader);
      expect(header2).toBe(anotherBlockHeader);

      // Should call archive_v1_header twice with different hashes
      expect(providerSend).toHaveBeenCalledWith('archive_v1_header', [mockBlockHash]);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_header', [anotherBlockHash]);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_header').length).toBe(2);
    });

    it('should clear header cache when clearCache is called', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call
      await archive.header(mockBlockHash);
      // Clear cache
      archive.clearCache();
      // Second call with same hash after clearing cache
      await archive.header(mockBlockHash);

      // Should call archive_v1_header twice because cache was cleared
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_header').length).toBe(2);
    });
  });

  describe('finalizedHeight', () => {
    it('should return finalized height', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const height = await archive.finalizedHeight();

      expect(height).toBe(1000);
      expect(providerSend).toBeCalledWith('archive_v1_finalizedHeight', []);
    });
  });

  describe('finalizedHash', () => {
    it('should return finalized block hash', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const hash = await archive.finalizedHash();

      expect(hash).toBe(mockBlockHash);
      // Should call finalizedHeight first, then hashByHeight with the height
      expect(providerSend).toHaveBeenCalledWith('archive_v1_finalizedHeight', []);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_hashByHeight', [1000]);
    });

    it('should throw error when no block found at finalized height', async () => {
      const testProvider = new MockProvider();
      testProvider.setRpcRequests({
        rpc_methods: () => ({ methods: rpcMethods }),
        archive_v1_finalizedHeight: () => 5000,
        archive_v1_hashByHeight: () => [], // No blocks found
      });
      const testClient = new JsonRpcClient({ provider: testProvider });

      const archive = new Archive(testClient);

      await expect(archive.finalizedHash()).rejects.toThrow('No block found at finalized height 5000');
    });
  });

  describe('hashByHeight', () => {
    it('should return block hashes by height', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const hashes = await archive.hashByHeight(500);

      expect(hashes).toEqual([mockBlockHash]);
      expect(providerSend).toBeCalledWith('archive_v1_hashByHeight', [500]);
    });

    it('should return empty array for non-existent height', async () => {
      const testProvider = new MockProvider();
      testProvider.setRpcRequests({
        rpc_methods: () => ({ methods: rpcMethods }),
        archive_v1_hashByHeight: () => [],
      });
      const testClient = new JsonRpcClient({ provider: testProvider });

      const archive = new Archive(testClient);
      const hashes = await archive.hashByHeight(999999);

      expect(hashes).toEqual([]);
    });
  });

  describe('call', () => {
    it('should execute runtime call', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const result = await archive.call('Core_version', '0x', mockBlockHash);

      expect(result).toBe('0x1234');
      expect(providerSend).toBeCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0x']);
    });

    it('should use finalized hash when no hash provided', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const result = await archive.call('Core_version', '0x');

      expect(result).toBe('0x1234');
      // Should call finalizedHeight, hashByHeight, then call
      expect(providerSend).toHaveBeenCalledWith('archive_v1_finalizedHeight', []);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_hashByHeight', [1000]);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0x']);
    });

    it('should handle runtime call errors', async () => {
      const testProvider = new MockProvider();
      testProvider.setRpcRequests({
        rpc_methods: () => ({ methods: rpcMethods }),
        archive_v1_call: () => ({ success: false, error: 'Runtime error' }),
      });
      const testClient = new JsonRpcClient({ provider: testProvider });

      const archive = new Archive(testClient);

      await expect(archive.call('Invalid_method', '0x', mockBlockHash)).rejects.toThrow(DedotError);
    });

    it('should cache call results', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call
      const result1 = await archive.call('Core_version', '0x', mockBlockHash);
      // Second call with same parameters
      const result2 = await archive.call('Core_version', '0x', mockBlockHash);

      expect(result1).toBe('0x1234');
      expect(result2).toBe('0x1234');
      expect(result1).toBe(result2); // Should be the same reference (cached)

      // Should only call archive_v1_call once
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(1);
    });

    it('should not use cache for different functions', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_call: (params: any) => {
          if (params[1] === 'Metadata_metadata') {
            return { success: true, value: '0x5678' };
          }
          return { success: true, value: '0x1234' };
        },
      });

      // First call with Core_version
      const result1 = await archive.call('Core_version', '0x', mockBlockHash);
      // Second call with different function
      const result2 = await archive.call('Metadata_metadata', '0x', mockBlockHash);

      expect(result1).toBe('0x1234');
      expect(result2).toBe('0x5678');

      // Should call archive_v1_call twice with different functions
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0x']);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [mockBlockHash, 'Metadata_metadata', '0x']);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(2);
    });

    it('should not use cache for different params', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_call: (params: any) => {
          if (params[2] === '0xabcd') {
            return { success: true, value: '0x9999' };
          }
          return { success: true, value: '0x1234' };
        },
      });

      // First call with params '0x'
      const result1 = await archive.call('Core_version', '0x', mockBlockHash);
      // Second call with different params
      const result2 = await archive.call('Core_version', '0xabcd', mockBlockHash);

      expect(result1).toBe('0x1234');
      expect(result2).toBe('0x9999');

      // Should call archive_v1_call twice with different params
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0x']);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0xabcd']);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(2);
    });

    it('should not use cache for different block hashes', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const anotherBlockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_call: (params: any) => {
          if (params[0] === anotherBlockHash) {
            return { success: true, value: '0xeeee' };
          }
          return { success: true, value: '0x1234' };
        },
      });

      // First call with mockBlockHash
      const result1 = await archive.call('Core_version', '0x', mockBlockHash);
      // Second call with different hash
      const result2 = await archive.call('Core_version', '0x', anotherBlockHash);

      expect(result1).toBe('0x1234');
      expect(result2).toBe('0xeeee');

      // Should call archive_v1_call twice with different hashes
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0x']);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_call', [anotherBlockHash, 'Core_version', '0x']);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(2);
    });

    it('should clear call cache when clearCache is called', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call
      await archive.call('Core_version', '0x', mockBlockHash);
      // Clear cache
      archive.clearCache();
      // Second call with same parameters after clearing cache
      await archive.call('Core_version', '0x', mockBlockHash);

      // Should call archive_v1_call twice because cache was cleared
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(2);
    });
  });

  describe('storage', () => {
    it('should return storage entries', async () => {
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];

      // Set up the promise
      const storagePromise = archive.storage(items, null, mockBlockHash);

      // Simulate subscription events
      setTimeout(() => {
        provider.notify('storage_subscription_123', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_123', {
          event: 'storageDone',
        });
      }, 10);

      const result = await storagePromise;
      expect(result).toEqual([{ key: '0x1234', value: '0x5678', event: 'storage' }]);
    });

    it('should use finalized hash when no hash provided', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];

      const storagePromise = archive.storage(items);

      // Simulate subscription events
      setTimeout(() => {
        provider.notify('storage_subscription_123', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_123', {
          event: 'storageDone',
        });
      }, 10);

      const result = await storagePromise;

      // Should call finalizedHeight, hashByHeight, then storage
      expect(providerSend).toHaveBeenCalledWith('archive_v1_finalizedHeight', []);
      expect(providerSend).toHaveBeenCalledWith('archive_v1_hashByHeight', [1000]);
      expect(result).toEqual([{ key: '0x1234', value: '0x5678', event: 'storage' }]);
    });

    it('should support child trie queries', async () => {
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];
      const childTrie = '0xabcd';

      const storagePromise = archive.storage(items, childTrie, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_123', {
          event: 'storage',
          result: { key: '0x1234', value: '0x5678' },
        });
        provider.notify('storage_subscription_123', {
          event: 'storageDone',
        });
      }, 10);

      await storagePromise;
    });

    it('should support pagination', async () => {
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const, paginationStartKey: '0x0000' }];

      const storagePromise = archive.storage(items, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_123', {
          event: 'storage',
          result: { key: '0x1234', value: '0x5678' },
        });
        provider.notify('storage_subscription_123', {
          event: 'storageDone',
        });
      }, 10);

      await storagePromise;
    });

    it('should cache storage results', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];

      // First call
      const storagePromise1 = archive.storage(items, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_123', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_123', {
          event: 'storageDone',
        });
      }, 10);

      const result1 = await storagePromise1;

      // Second call with same parameters should use cache
      const result2 = await archive.storage(items, null, mockBlockHash);

      expect(result1).toEqual([{ key: '0x1234', value: '0x5678', event: 'storage' }]);
      expect(result2).toEqual([{ key: '0x1234', value: '0x5678', event: 'storage' }]);
      expect(result1).toBe(result2); // Should be the same reference (cached)

      // Should only call archive_v1_storage once
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(1);
    });

    it('should not use cache for different storage items', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items1 = [{ key: '0x1234', type: 'value' as const }];
      const items2 = [{ key: '0x5678', type: 'value' as const }];

      let subscriptionCounter = 0;
      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_storage: () => {
          subscriptionCounter++;
          return `storage_subscription_${subscriptionCounter}`;
        },
      });

      // First call with items1
      const storagePromise1 = archive.storage(items1, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_1', {
          event: 'storage',
          key: '0x1234',
          value: '0xaaaa',
        });
        provider.notify('storage_subscription_1', {
          event: 'storageDone',
        });
      }, 10);

      const result1 = await storagePromise1;

      // Second call with different items
      const storagePromise2 = archive.storage(items2, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_2', {
          event: 'storage',
          key: '0x5678',
          value: '0xbbbb',
        });
        provider.notify('storage_subscription_2', {
          event: 'storageDone',
        });
      }, 10);

      const result2 = await storagePromise2;

      expect(result1).toEqual([{ key: '0x1234', value: '0xaaaa', event: 'storage' }]);
      expect(result2).toEqual([{ key: '0x5678', value: '0xbbbb', event: 'storage' }]);

      // Should call archive_v1_storage twice with different items
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(2);
    });

    it('should not use cache for different child trie', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];

      let subscriptionCounter = 0;
      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_storage: () => {
          subscriptionCounter++;
          return `storage_subscription_${subscriptionCounter}`;
        },
      });

      // First call with null childTrie
      const storagePromise1 = archive.storage(items, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_1', {
          event: 'storage',
          key: '0x1234',
          value: '0xaaaa',
        });
        provider.notify('storage_subscription_1', {
          event: 'storageDone',
        });
      }, 10);

      const result1 = await storagePromise1;

      // Second call with childTrie
      const storagePromise2 = archive.storage(items, '0xabcd', mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_2', {
          event: 'storage',
          key: '0x1234',
          value: '0xbbbb',
        });
        provider.notify('storage_subscription_2', {
          event: 'storageDone',
        });
      }, 10);

      const result2 = await storagePromise2;

      expect(result1).toEqual([{ key: '0x1234', value: '0xaaaa', event: 'storage' }]);
      expect(result2).toEqual([{ key: '0x1234', value: '0xbbbb', event: 'storage' }]);

      // Should call archive_v1_storage twice with different child trie
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(2);
    });

    it('should not use cache for different block hashes', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];
      const anotherBlockHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      let subscriptionCounter = 0;
      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_storage: () => {
          subscriptionCounter++;
          return `storage_subscription_${subscriptionCounter}`;
        },
      });

      // First call with mockBlockHash
      const storagePromise1 = archive.storage(items, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_1', {
          event: 'storage',
          key: '0x1234',
          value: '0xaaaa',
        });
        provider.notify('storage_subscription_1', {
          event: 'storageDone',
        });
      }, 10);

      const result1 = await storagePromise1;

      // Second call with different hash
      const storagePromise2 = archive.storage(items, null, anotherBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_2', {
          event: 'storage',
          key: '0x1234',
          value: '0xbbbb',
        });
        provider.notify('storage_subscription_2', {
          event: 'storageDone',
        });
      }, 10);

      const result2 = await storagePromise2;

      expect(result1).toEqual([{ key: '0x1234', value: '0xaaaa', event: 'storage' }]);
      expect(result2).toEqual([{ key: '0x1234', value: '0xbbbb', event: 'storage' }]);

      // Should call archive_v1_storage twice with different hashes
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(2);
    });

    it('should clear storage cache when clearCache is called', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];

      let subscriptionCounter = 0;
      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_storage: () => {
          subscriptionCounter++;
          return `storage_subscription_${subscriptionCounter}`;
        },
      });

      // First call
      const storagePromise1 = archive.storage(items, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_1', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_1', {
          event: 'storageDone',
        });
      }, 10);

      await storagePromise1;

      // Clear cache
      archive.clearCache();

      // Second call with same parameters after clearing cache
      const storagePromise2 = archive.storage(items, null, mockBlockHash);

      setTimeout(() => {
        provider.notify('storage_subscription_2', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_2', {
          event: 'storageDone',
        });
      }, 10);

      await storagePromise2;

      // Should call archive_v1_storage twice because cache was cleared
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(2);
    });
  });

  describe('version detection', () => {
    it('should detect v1 version', async () => {
      const archive = new Archive(client);
      const version = await archive.version();

      expect(version).toBe('v1');
    });

    it('should support unstable version', async () => {
      const unstableMethods = rpcMethods.map((m) => m.replace('_v1_', '_unstable_'));
      provider.setRpcRequests({
        rpc_methods: () => ({ methods: unstableMethods }),
        archive_unstable_genesisHash: () => mockGenesisHash,
      });

      const archive = new Archive(client);
      const genesisHash = await archive.genesisHash();

      expect(genesisHash).toBe(mockGenesisHash);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data from all methods', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];

      let subscriptionCounter = 0;
      provider.setRpcRequests({
        ...provider.rpcRequests,
        archive_v1_storage: () => {
          subscriptionCounter++;
          return `storage_subscription_${subscriptionCounter}`;
        },
      });

      // Call all cacheable methods once to populate cache
      await archive.body(mockBlockHash);
      await archive.header(mockBlockHash);
      await archive.call('Core_version', '0x', mockBlockHash);

      const storagePromise1 = archive.storage(items, null, mockBlockHash);
      setTimeout(() => {
        provider.notify('storage_subscription_1', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_1', {
          event: 'storageDone',
        });
      }, 10);
      await storagePromise1;

      // Verify initial calls were made
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_body').length).toBe(1);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_header').length).toBe(1);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(1);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(1);

      // Clear cache
      archive.clearCache();

      // Call all methods again with same parameters
      await archive.body(mockBlockHash);
      await archive.header(mockBlockHash);
      await archive.call('Core_version', '0x', mockBlockHash);

      const storagePromise2 = archive.storage(items, null, mockBlockHash);
      setTimeout(() => {
        provider.notify('storage_subscription_2', {
          event: 'storage',
          key: '0x1234',
          value: '0x5678',
        });
        provider.notify('storage_subscription_2', {
          event: 'storageDone',
        });
      }, 10);
      await storagePromise2;

      // All methods should have been called twice (once before, once after cache clear)
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_body').length).toBe(2);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_header').length).toBe(2);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_call').length).toBe(2);
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_storage').length).toBe(2);
    });

    it('should not affect genesisHash cache (uses separate caching mechanism)', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);

      // First call to genesisHash
      const genesisHash1 = await archive.genesisHash();

      // Clear cache using clearCache()
      archive.clearCache();

      // Second call to genesisHash should still be cached
      const genesisHash2 = await archive.genesisHash();

      expect(genesisHash1).toBe(mockGenesisHash);
      expect(genesisHash2).toBe(mockGenesisHash);
      expect(genesisHash1).toBe(genesisHash2);

      // Should only call archive_v1_genesisHash once (because it uses #genesisHash field, not #cache Map)
      expect(providerSend.mock.calls.filter((call) => call[0] === 'archive_v1_genesisHash').length).toBe(1);
    });
  });
});
