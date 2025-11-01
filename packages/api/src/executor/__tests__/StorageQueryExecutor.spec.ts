import { BlockHash, Option, PortableRegistry, StorageData, StorageKey } from '@dedot/codecs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';
import { QueryableStorage } from '../../storage/QueryableStorage.js';

// Create a mock client with required methods
const createMockClient = () => ({
  rpcVersion: 'legacy' as const,
  registry: {} as PortableRegistry,
  rpc: {
    state_getKeysPaged: vi.fn(),
  },
});

// Create a mock QueryableStorage
const createMockEntry = () => {
  const mockEntry = {
    pallet: { name: 'System', index: 0 },
    storageEntry: {
      name: 'Account',
      storageType: { type: 'Map' },
    },
    prefixKey: '0xprefix' as StorageKey,
    encodeKey: vi.fn((args: any, isPartial?: boolean) => {
      if (isPartial) return `0xpartial_${JSON.stringify(args)}` as StorageKey;
      return `0xkey_${JSON.stringify(args)}` as StorageKey;
    }),
    decodeKey: vi.fn((key: StorageKey) => {
      // Mock decoded key format
      return { address: () => `decoded_${key}` };
    }),
    decodeValue: vi.fn((value: Option<StorageData>) => {
      // Mock decoded value format
      return { data: { free: 1000n } };
    }),
  };
  return mockEntry as unknown as QueryableStorage;
};

describe('StorageQueryExecutor', () => {
  let executor: StorageQueryExecutor;
  let mockClient: ReturnType<typeof createMockClient>;
  let mockEntry: QueryableStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    
    // Create executor instance
    executor = new StorageQueryExecutor(mockClient as any);
    mockEntry = createMockEntry();

    // Mock queryStorage method
    vi.spyOn(executor as any, 'queryStorage').mockImplementation(
      async (keys: StorageKey[]) => {
        const result: Record<StorageKey, Option<StorageData>> = {};
        keys.forEach((key) => {
          result[key] = `0xvalue_${key}` as any;
        });
        return result;
      }
    );
  });

  describe('entries method', () => {
    it('should return empty array for empty storage', async () => {
      // Mock empty response
      mockClient.rpc.state_getKeysPaged.mockResolvedValue([]);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const result = await methods.entries();

      expect(result).toEqual([]);
      expect(mockClient.rpc.state_getKeysPaged).toHaveBeenCalledTimes(1);
    });

    it('should fetch all entries in a single page when total < page size', async () => {
      // Mock single page response (less than 250 items)
      const mockKeys = ['0x01', '0x02', '0x03'] as StorageKey[];
      mockClient.rpc.state_getKeysPaged.mockResolvedValue(mockKeys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const result = await methods.entries();

      expect(result).toHaveLength(3);
      expect(mockClient.rpc.state_getKeysPaged).toHaveBeenCalledTimes(1);
      
      // Verify decode methods were called
      expect(mockEntry.decodeKey).toHaveBeenCalledTimes(3);
      expect(mockEntry.decodeValue).toHaveBeenCalledTimes(3);
      
      // Verify the structure of returned data
      result.forEach(([key, value]: [any, any]) => {
        expect(key).toBeDefined();
        expect(value).toBeDefined();
        expect(value.data.free).toBe(1000n);
      });
    });

    it('should paginate correctly when entries span multiple pages', async () => {
      // Create mock keys for multiple pages
      const page1Keys = Array.from({ length: 250 }, (_, i) => `0xkey_${i}`) as StorageKey[];
      const page2Keys = Array.from({ length: 250 }, (_, i) => `0xkey_${i + 250}`) as StorageKey[];
      const page3Keys = Array.from({ length: 100 }, (_, i) => `0xkey_${i + 500}`) as StorageKey[];

      mockClient.rpc.state_getKeysPaged
        .mockResolvedValueOnce(page1Keys)
        .mockResolvedValueOnce(page2Keys)
        .mockResolvedValueOnce(page3Keys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const result = await methods.entries();

      // Should have accumulated all entries
      expect(result).toHaveLength(600);
      
      // Should have made 3 RPC calls
      expect(mockClient.rpc.state_getKeysPaged).toHaveBeenCalledTimes(3);
      
      // Verify pagination parameters
      const calls = mockClient.rpc.state_getKeysPaged.mock.calls;
      
      // First call: no startKey
      expect(calls[0][2]).toBeUndefined(); // startKey should be undefined initially
      
      // Second call: should use last key from page 1 as startKey
      expect(calls[1][2]).toBe(page1Keys[page1Keys.length - 1]);
      
      // Third call: should use last key from page 2 as startKey
      expect(calls[2][2]).toBe(page2Keys[page2Keys.length - 1]);
    });

    it('should handle partial key arguments', async () => {
      const mockKeys = ['0x01', '0x02'] as StorageKey[];
      mockClient.rpc.state_getKeysPaged.mockResolvedValue(mockKeys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const partialArgs = ['someAccount'];
      const result = await methods.entries(...partialArgs);

      expect(result).toHaveLength(2);
      
      // Verify encodeKey was called with partial flag
      expect(mockEntry.encodeKey).toHaveBeenCalledWith(partialArgs, true);
    });

    it('should stop pagination when receiving fewer items than page size', async () => {
      // First page: full (250 items)
      const page1Keys = Array.from({ length: 250 }, (_, i) => `0xkey_${i}`) as StorageKey[];
      // Second page: partial (less than 250 items)
      const page2Keys = Array.from({ length: 50 }, (_, i) => `0xkey_${i + 250}`) as StorageKey[];

      mockClient.rpc.state_getKeysPaged
        .mockResolvedValueOnce(page1Keys)
        .mockResolvedValueOnce(page2Keys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const result = await methods.entries();

      expect(result).toHaveLength(300);
      
      // Should stop after 2 calls (second page had < 250 items)
      expect(mockClient.rpc.state_getKeysPaged).toHaveBeenCalledTimes(2);
    });

    it('should decode keys and values correctly', async () => {
      const mockKeys = ['0xkey1', '0xkey2'] as StorageKey[];
      mockClient.rpc.state_getKeysPaged.mockResolvedValue(mockKeys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const result = await methods.entries();

      // Verify each key was decoded
      mockKeys.forEach((key) => {
        expect(mockEntry.decodeKey).toHaveBeenCalledWith(key);
      });

      // Verify each value was decoded
      expect(mockEntry.decodeValue).toHaveBeenCalledTimes(mockKeys.length);
      
      // Verify the result structure
      expect(result).toHaveLength(2);
      result.forEach(([key, value]: [any, any]) => {
        expect(key.address).toBeDefined();
        expect(typeof key.address()).toBe('string');
        expect(value.data.free).toBe(1000n);
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock an error from RPC call
      const mockError = new Error('RPC error');
      mockClient.rpc.state_getKeysPaged.mockRejectedValue(mockError);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      
      await expect(methods.entries()).rejects.toThrow('RPC error');
    });

    it('should handle pagination options in extractArgs', async () => {
      const mockKeys = ['0x01'] as StorageKey[];
      mockClient.rpc.state_getKeysPaged.mockResolvedValue(mockKeys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      
      // Call with pagination options (should be ignored by entries method)
      const result = await methods.entries('arg1', { pageSize: 100 });

      // Should still work (extractArgs should extract args from pagination)
      expect(result).toBeDefined();
    });

    it('should accumulate entries correctly across pages', async () => {
      const page1Keys = ['0xa', '0xb'] as StorageKey[];
      const page2Keys = ['0xc', '0xd'] as StorageKey[];
      const page3Keys = ['0xe'] as StorageKey[];

      mockClient.rpc.state_getKeysPaged
        .mockResolvedValueOnce(Array.from({ length: 250 }, () => page1Keys[0]))
        .mockResolvedValueOnce(Array.from({ length: 250 }, () => page2Keys[0]))
        .mockResolvedValueOnce(page3Keys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      const result = await methods.entries();

      // Should have all entries from all pages
      expect(result).toHaveLength(501);
    });
  });

  describe('integration with pagedEntries', () => {
    it('should be compatible with pagedEntries structure', async () => {
      const mockKeys = ['0x01', '0x02'] as StorageKey[];
      mockClient.rpc.state_getKeysPaged.mockResolvedValue(mockKeys);

      const methods = (executor as any).exposeStorageMapMethods(mockEntry);
      
      // Both should return same structure
      const pagedResult = await methods.pagedEntries();
      const allResult = await methods.entries();

      // Both should have same structure [key, value][]
      expect(Array.isArray(pagedResult)).toBe(true);
      expect(Array.isArray(allResult)).toBe(true);
      
      if (pagedResult.length > 0 && allResult.length > 0) {
        expect(pagedResult[0]).toHaveLength(2);
        expect(allResult[0]).toHaveLength(2);
      }
    });
  });
});

