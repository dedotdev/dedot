import { StorageData, StorageKey } from '@dedot/codecs';
import { Callback, Unsub } from '@dedot/types';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LegacyClient } from '../../client/LegacyClient.js';
import { LegacyStorageQuery } from '../LegacyStorageQuery.js';

// Mock the LegacyClient
vi.mock('../../client/LegacyClient.js', () => {
  return {
    LegacyClient: vi.fn().mockImplementation(() => {
      return {
        rpcVersion: 'legacy',
        rpc: {
          state_queryStorageAt: vi.fn(),
          state_subscribeStorage: vi.fn(),
        },
      };
    }),
  };
});

describe('LegacyStorageQuery', () => {
  let mockClient: LegacyClient;
  let service: LegacyStorageQuery;
  let mockKeys: StorageKey[];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a mock client
    mockClient = new LegacyClient({} as any);

    // Create the service
    service = new LegacyStorageQuery(mockClient);

    // Create some test keys
    mockKeys = ['0x01', '0x02'] as StorageKey[];
  });

  describe('query method', () => {
    it('should call state_queryStorageAt with the correct parameters', async () => {
      // Setup mock response
      const mockChanges = [
        {
          changes: [
            ['0x01', '0xvalue1'],
            ['0x02', '0xvalue2'],
          ],
        },
      ];
      (mockClient.rpc.state_queryStorageAt as any).mockResolvedValue(mockChanges);

      // Call the method
      await service.query(mockKeys);

      // Verify the RPC call
      expect(mockClient.rpc.state_queryStorageAt).toHaveBeenCalledTimes(1);
      expect(mockClient.rpc.state_queryStorageAt).toHaveBeenCalledWith(mockKeys);
    });

    it('should return a record mapping keys to values', async () => {
      // Setup mock response with values in a different order than the keys
      const mockChanges = [
        {
          changes: [
            ['0x02', '0xvalue2'],
            ['0x01', '0xvalue1'],
          ],
        },
      ];
      (mockClient.rpc.state_queryStorageAt as any).mockResolvedValue(mockChanges);

      // Call the method
      const result = await service.query(mockKeys);

      // Verify the result
      expect(result).toEqual({
        '0x01': '0xvalue1',
        '0x02': '0xvalue2',
      });
    });

    it('should handle undefined values', async () => {
      // Setup mock response with an undefined value
      const mockChanges = [
        {
          changes: [
            ['0x01', '0xvalue1'],
            ['0x02', undefined],
          ],
        },
      ];
      (mockClient.rpc.state_queryStorageAt as any).mockResolvedValue(mockChanges);

      // Call the method
      const result = await service.query(mockKeys);

      // Verify the result
      expect(result).toEqual({
        '0x01': '0xvalue1',
        '0x02': undefined,
      });
    });

    it('should handle missing keys in the response', async () => {
      // Setup mock response with a missing key
      const mockChanges = [{ changes: [['0x01', '0xvalue1']] }];
      (mockClient.rpc.state_queryStorageAt as any).mockResolvedValue(mockChanges);

      // Call the method
      const result = await service.query(mockKeys);

      // Verify the result
      expect(result).toEqual({
        '0x01': '0xvalue1',
        '0x02': undefined,
      });
    });

    it('should handle empty response', async () => {
      // Setup mock response with no changes
      const mockChanges = [{ changes: [] }];
      (mockClient.rpc.state_queryStorageAt as any).mockResolvedValue(mockChanges);

      // Call the method
      const result = await service.query(mockKeys);

      // Verify the result
      expect(result).toEqual({
        '0x01': undefined,
        '0x02': undefined,
      });
    });
  });

  describe('subscribe method', () => {
    it('should call state_subscribeStorage with the correct parameters', async () => {
      // Setup mock response
      const mockUnsub = vi.fn();
      (mockClient.rpc.state_subscribeStorage as any).mockResolvedValue(mockUnsub);

      // Mock callback
      const callback = vi.fn();

      // Call the method
      await service.subscribe(mockKeys, callback);

      // Verify the RPC call
      expect(mockClient.rpc.state_subscribeStorage).toHaveBeenCalledTimes(1);
      expect(mockClient.rpc.state_subscribeStorage).toHaveBeenCalledWith(mockKeys, expect.any(Function));
    });

    it('should call the callback when changes are received', async () => {
      // Setup mock subscription handler
      let subscriptionCallback: Function | undefined;
      const mockUnsub = vi.fn();
      (mockClient.rpc.state_subscribeStorage as any).mockImplementation((keys: StorageKey[], cb: Function) => {
        subscriptionCallback = cb;
        return Promise.resolve(mockUnsub);
      });

      // Mock callback
      const callback = vi.fn();

      // Call the method
      await service.subscribe(mockKeys, callback);

      // Simulate a change event
      const mockChangeSet = {
        changes: [
          ['0x01', '0xvalue1'],
          ['0x02', '0xvalue2'],
        ],
      };
      if (subscriptionCallback) {
        subscriptionCallback(mockChangeSet);
      }

      // Verify the callback was called with the correct values
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        '0x01': '0xvalue1',
        '0x02': '0xvalue2',
      });
    });

    it('should handle changes in a different order than the keys', async () => {
      // Setup mock subscription handler
      let subscriptionCallback: Function | undefined;
      const mockUnsub = vi.fn();
      (mockClient.rpc.state_subscribeStorage as any).mockImplementation((keys: StorageKey[], cb: Function) => {
        subscriptionCallback = cb;
        return Promise.resolve(mockUnsub);
      });

      // Mock callback
      const callback = vi.fn();

      // Call the method
      await service.subscribe(mockKeys, callback);

      // Simulate a change event with values in a different order
      const mockChangeSet = {
        changes: [
          ['0x02', '0xvalue2'],
          ['0x01', '0xvalue1'],
        ],
      };
      if (subscriptionCallback) {
        subscriptionCallback(mockChangeSet);
      }

      // Verify the callback was called with a record containing all keys
      expect(callback).toHaveBeenCalledWith({
        '0x01': '0xvalue1',
        '0x02': '0xvalue2',
      });
    });

    it('should handle undefined values in changes', async () => {
      // Setup mock subscription handler
      let subscriptionCallback: Function | undefined;
      const mockUnsub = vi.fn();
      (mockClient.rpc.state_subscribeStorage as any).mockImplementation((keys: StorageKey[], cb: Function) => {
        subscriptionCallback = cb;
        return Promise.resolve(mockUnsub);
      });

      // Mock callback
      const callback = vi.fn();

      // Call the method
      await service.subscribe(mockKeys, callback);

      // Simulate a change event with an undefined value
      const mockChangeSet = {
        changes: [
          ['0x01', '0xvalue1'],
          ['0x02', undefined],
        ],
      };
      if (subscriptionCallback) {
        subscriptionCallback(mockChangeSet);
      }

      // Verify the callback was called with the correct values
      expect(callback).toHaveBeenCalledWith({
        '0x01': '0xvalue1',
        '0x02': undefined,
      });
    });

    it('should handle missing keys in changes', async () => {
      // Setup mock subscription handler
      let subscriptionCallback: Function | undefined;
      const mockUnsub = vi.fn();
      (mockClient.rpc.state_subscribeStorage as any).mockImplementation((keys: StorageKey[], cb: Function) => {
        subscriptionCallback = cb;
        return Promise.resolve(mockUnsub);
      });

      // Mock callback
      const callback = vi.fn();

      // Call the method
      await service.subscribe(mockKeys, callback);

      // Simulate a change event with a missing key
      const mockChangeSet = {
        changes: [['0x01', '0xvalue1']],
      };
      if (subscriptionCallback) {
        subscriptionCallback(mockChangeSet);
      }

      // Verify the callback was called with the correct values
      expect(callback).toHaveBeenCalledWith({
        '0x01': '0xvalue1',
        '0x02': undefined,
      });
    });

    it('should return an unsubscribe function', async () => {
      // Setup mock response
      const mockUnsub = vi.fn();
      (mockClient.rpc.state_subscribeStorage as any).mockResolvedValue(mockUnsub);

      // Call the method
      const unsub = await service.subscribe(mockKeys, vi.fn());

      // Verify the unsubscribe function
      expect(typeof unsub).toBe('function');

      // Call the unsubscribe function
      await unsub();

      // Verify the mock unsubscribe was called
      expect(mockUnsub).toHaveBeenCalledTimes(1);
    });
  });
});
