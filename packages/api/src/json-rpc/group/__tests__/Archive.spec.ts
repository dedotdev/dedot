import { stringToHex } from '@dedot/utils';
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
      archive_v1_call: () => ({ success: true, result: '0x1234' }),
      archive_v1_storage: () => ({
        result: [{ key: '0x1234', value: '0x5678' }],
        discardedItems: 0,
      }),
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
      expect(providerSend.mock.calls.filter(call => call[0] === 'archive_v1_genesisHash').length).toBe(1);
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
  });

  describe('finalizedHeight', () => {
    it('should return finalized height', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const height = await archive.finalizedHeight();
      
      expect(height).toBe(1000);
      expect(providerSend).toBeCalledWith('archive_v1_finalizedHeight', []);
    });

    it('should cache finalized height for 2 seconds', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      
      const height1 = await archive.finalizedHeight();
      const height2 = await archive.finalizedHeight();
      
      expect(height1).toBe(height2);
      // First call is for rpc_methods, second is for finalizedHeight
      expect(providerSend).toHaveBeenCalledWith('archive_v1_finalizedHeight', []);
      expect(providerSend.mock.calls.filter(call => call[0] === 'archive_v1_finalizedHeight').length).toBe(1);
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
      const result = await archive.call(mockBlockHash, 'Core_version', '0x');
      
      expect(result).toEqual({ success: true, result: '0x1234' });
      expect(providerSend).toBeCalledWith('archive_v1_call', [mockBlockHash, 'Core_version', '0x']);
    });

    it('should handle runtime call errors', async () => {
      const testProvider = new MockProvider();
      testProvider.setRpcRequests({
        rpc_methods: () => ({ methods: rpcMethods }),
        archive_v1_call: () => ({ success: false, error: 'Runtime error' }),
      });
      const testClient = new JsonRpcClient({ provider: testProvider });
      
      const archive = new Archive(testClient);
      const result = await archive.call(mockBlockHash, 'Invalid_method', '0x');
      
      expect(result).toEqual({ success: false, error: 'Runtime error' });
    });
  });

  describe('storage', () => {
    it('should return storage entries', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];
      const result = await archive.storage(mockBlockHash, items);
      
      expect(result).toEqual({
        result: [{ key: '0x1234', value: '0x5678' }],
        discardedItems: 0,
      });
      expect(providerSend).toBeCalledWith('archive_v1_storage', [mockBlockHash, items, null]);
    });

    it('should support child trie queries', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', type: 'value' as const }];
      const childTrie = '0xabcd';
      
      await archive.storage(mockBlockHash, items, childTrie);
      
      expect(providerSend).toBeCalledWith('archive_v1_storage', [mockBlockHash, items, childTrie]);
    });

    it('should support pagination', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [
        { key: '0x1234', type: 'value' as const, paginationStartKey: '0x0000' },
      ];
      
      await archive.storage(mockBlockHash, items);
      
      expect(providerSend).toBeCalledWith('archive_v1_storage', [mockBlockHash, items, null]);
    });
  });

  describe('storageDiff', () => {
    it('should return operation ID for storage diff', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', returnType: 'value' as const }];
      
      const operationId = await archive.storageDiff(mockBlockHash, items);
      
      expect(operationId).toBe('operation_123');
      expect(providerSend).toBeCalledWith('archive_v1_storageDiff', [mockBlockHash, items, null, null]);
    });

    it('should support previous hash comparison', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      const items = [{ key: '0x1234', returnType: 'value' as const }];
      const previousHash = '0xprevious';
      
      await archive.storageDiff(mockBlockHash, items, previousHash);
      
      expect(providerSend).toBeCalledWith('archive_v1_storageDiff', [mockBlockHash, items, previousHash, null]);
    });
  });

  describe('stopStorage', () => {
    it('should stop storage operation', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      
      await archive.stopStorage('operation_123');
      
      expect(providerSend).toBeCalledWith('archive_v1_stopStorage', ['operation_123']);
    });
  });

  describe('stopStorageDiff', () => {
    it('should stop storage diff operation', async () => {
      const providerSend = vi.spyOn(client.provider, 'send');
      const archive = new Archive(client);
      
      await archive.stopStorageDiff('operation_456');
      
      expect(providerSend).toBeCalledWith('archive_v1_stopStorageDiff', ['operation_456']);
    });
  });

  describe('version detection', () => {
    it('should detect v1 version', async () => {
      const archive = new Archive(client);
      const version = await archive.version();
      
      expect(version).toBe('v1');
    });

    it('should support unstable version', async () => {
      const unstableMethods = rpcMethods.map(m => m.replace('_v1_', '_unstable_'));
      provider.setRpcRequests({
        rpc_methods: () => ({ methods: unstableMethods }),
        archive_unstable_genesisHash: () => mockGenesisHash,
      });
      
      const archive = new Archive(client);
      const genesisHash = await archive.genesisHash();
      
      expect(genesisHash).toBe(mockGenesisHash);
    });
  });
});