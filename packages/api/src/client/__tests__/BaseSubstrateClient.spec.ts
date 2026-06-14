import { type JsonRpcProvider, MaxRetryAttemptedError, WsProvider } from '@dedot/providers';
import { type IStorage } from '@dedot/storage';
import { JsonRpcV2NotSupportedError } from '@dedot/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseSubstrateClient } from '../BaseSubstrateClient.js';
import MockProvider from './MockProvider.js';

// A WsProvider that never opens a real socket - used to test endpoint switching behavior
class MockWsProvider extends WsProvider {
  disconnectCalls: boolean[] = [];
  failOnSwitch: boolean = false;

  constructor() {
    super('ws://127.0.0.1:1');
  }

  async connect(): Promise<this> {
    this._setStatus('connected');
    return this;
  }

  async disconnect(switchEndpoint?: boolean): Promise<void> {
    this.disconnectCalls.push(!!switchEndpoint);

    if (this.failOnSwitch) {
      this.emit('error', new MaxRetryAttemptedError('Cannot reconnect to network after 3 retry attempts'));
      this._setStatus('disconnected');
      return;
    }

    // Simulate an automatic reconnection to a different endpoint
    this._setStatus('disconnected');
    setTimeout(() => this._setStatus('connected'), 10);
  }
}

// Create a mock implementation of BaseSubstrateClient for testing
class MockBaseSubstrateClient extends BaseSubstrateClient {
  constructor(provider: JsonRpcProvider = new MockProvider()) {
    super('v2', provider);
  }

  // Expose protected methods for testing
  public exposedSafeSetMetadataToCache(key: string, value: string): Promise<void> {
    return this.safeSetMetadataToCache(key, value);
  }

  // Implement abstract methods
  protected async doInitialize() {
    // No-op for testing
  }

  get query(): any {
    // Mock implementation - not actually used in tests
    return {} as any;
  }

  get tx(): any {
    // Mock implementation - not actually used in tests
    return {} as any;
  }

  protected callAt(): any {
    // Mock implementation - not actually used in tests
    return {} as any;
  }

  at(): any {
    // Mock implementation - not actually used in tests
    return Promise.resolve({} as any);
  }
}

// Create a mock implementation of IStorage
class MockStorage implements IStorage {
  private storage: Map<string, string> = new Map();
  private maxSize: number = Infinity;
  private currentSize: number = 0;

  constructor(options?: { maxSize?: number }) {
    this.maxSize = options?.maxSize || Infinity;
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<string> {
    // Check if adding this value would exceed the max size
    if (this.currentSize + value.length > this.maxSize) {
      throw new Error('Storage limit exceeded');
    }

    // Store the value
    if (this.storage.has(key)) {
      this.currentSize -= this.storage.get(key)!.length;
    }
    this.storage.set(key, value);
    this.currentSize += value.length;
    return value;
  }

  async remove(key: string): Promise<void> {
    if (this.storage.has(key)) {
      this.currentSize -= this.storage.get(key)!.length;
      this.storage.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.storage.clear();
    this.currentSize = 0;
  }

  async length(): Promise<number> {
    return this.storage.size;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

describe('BaseSubstrateClient', () => {
  describe('safeSetMetadataToCache', () => {
    let client: MockBaseSubstrateClient;
    let consoleSpy: { warn: any; error: any; info: any };

    beforeEach(() => {
      client = new MockBaseSubstrateClient();

      // Spy on console methods
      consoleSpy = {
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should successfully set metadata in cache on first try', async () => {
      // Create a mock storage that will succeed
      const mockStorage = new MockStorage();

      // Set the mock storage on the client
      (client as any)._localCache = mockStorage;

      // Call the method
      await client.exposedSafeSetMetadataToCache('RAW_META/0x123/1', 'test-metadata-value');

      // Verify the storage was updated
      expect(await mockStorage.get('RAW_META/0x123/1')).toBe('test-metadata-value');

      // Verify no console warnings or errors were logged
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should clean up old metadata entries and retry when storage fails', async () => {
      // Create a simple storage
      const mockStorage = new MockStorage();

      // Set the mock storage on the client
      (client as any)._localCache = mockStorage;

      // Add some existing metadata entries
      await mockStorage.set('RAW_META/0x123/1', 'old-metadata-1');
      await mockStorage.set('RAW_META/0x456/1', 'old-metadata-2');
      await mockStorage.set('RAW_META/0x789/1', 'old-metadata-3');
      await mockStorage.set('OTHER_KEY', 'non-metadata-value');

      // Mock the set method to fail on first call, then succeed
      const setSpy = vi.spyOn(mockStorage, 'set');
      setSpy.mockImplementationOnce(() => {
        throw new Error('Storage limit exceeded');
      });

      // Call the method with a new key
      await client.exposedSafeSetMetadataToCache('RAW_META/0xabc/2', 'new-metadata-value');

      // Verify the old metadata entries were removed
      expect(await mockStorage.get('RAW_META/0x123/1')).toBeNull();
      expect(await mockStorage.get('RAW_META/0x456/1')).toBeNull();
      expect(await mockStorage.get('RAW_META/0x789/1')).toBeNull();

      // Verify the non-metadata entry was preserved
      expect(await mockStorage.get('OTHER_KEY')).toBe('non-metadata-value');

      // Verify the new metadata was stored
      expect(await mockStorage.get('RAW_META/0xabc/2')).toBe('new-metadata-value');

      // Verify console messages
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to store metadata in cache, attempting to clean up old entries:',
        expect.any(Error),
      );
      expect(consoleSpy.info).toHaveBeenCalledWith('Cleaned up 3 old metadata entries, trying again');
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should handle failure even after cleanup', async () => {
      // Create a simple storage
      const mockStorage = new MockStorage();

      // Set the mock storage on the client
      (client as any)._localCache = mockStorage;

      // Add some existing metadata entries
      await mockStorage.set('RAW_META/0x123/1', 'old-metadata-1');
      await mockStorage.set('RAW_META/0x456/1', 'old-metadata-2');

      // Mock the set method to fail on both calls
      const setSpy = vi.spyOn(mockStorage, 'set');
      setSpy
        .mockImplementationOnce(() => {
          throw new Error('Storage limit exceeded');
        })
        .mockImplementationOnce(() => {
          throw new Error('Storage limit exceeded even after cleanup');
        });

      // Call the method
      await client.exposedSafeSetMetadataToCache('RAW_META/0xabc/2', 'new-metadata-value');

      // Verify the old metadata entries were removed during cleanup
      expect(await mockStorage.get('RAW_META/0x123/1')).toBeNull();
      expect(await mockStorage.get('RAW_META/0x456/1')).toBeNull();

      // Verify the new metadata was not stored due to persistent failure
      expect(await mockStorage.get('RAW_META/0xabc/2')).toBeNull();

      // Verify console messages
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to store metadata in cache, attempting to clean up old entries:',
        expect.any(Error),
      );
      expect(consoleSpy.info).toHaveBeenCalledWith('Cleaned up 2 old metadata entries, trying again');
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to store metadata even after cleanup:', expect.any(Error));
    });

    it('should not remove the current key during cleanup', async () => {
      // Create a simple storage
      const mockStorage = new MockStorage();

      // Set the mock storage on the client
      (client as any)._localCache = mockStorage;

      // Add some existing metadata entries including the key we're trying to set
      await mockStorage.set('RAW_META/0x123/1', 'old-metadata-1');
      await mockStorage.set('RAW_META/0xabc/2', 'existing-value');

      // Mock the set method to fail on first call, then succeed
      const setSpy = vi.spyOn(mockStorage, 'set');
      setSpy.mockImplementationOnce(() => {
        throw new Error('Storage limit exceeded');
      });

      // Call the method with the same key
      await client.exposedSafeSetMetadataToCache('RAW_META/0xabc/2', 'new-metadata-value');

      // Verify only the other metadata entry was removed
      expect(await mockStorage.get('RAW_META/0x123/1')).toBeNull();

      // Verify the new metadata was stored
      expect(await mockStorage.get('RAW_META/0xabc/2')).toBe('new-metadata-value');
    });

    it('should handle size-based storage limits', async () => {
      // Create a mock storage with a size limit
      const mockStorage = new MockStorage({ maxSize: 100 });

      // Set the mock storage on the client
      (client as any)._localCache = mockStorage;

      // Add some existing metadata entries that take up space
      await mockStorage.set('RAW_META/0x123/1', 'a'.repeat(30));
      await mockStorage.set('RAW_META/0x456/1', 'b'.repeat(30));
      await mockStorage.set('RAW_META/0x789/1', 'c'.repeat(30));

      // Try to add a new entry that would exceed the limit
      await client.exposedSafeSetMetadataToCache('RAW_META/0xabc/2', 'd'.repeat(40));

      // Verify the old metadata entries were removed
      const keys = await mockStorage.keys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe('RAW_META/0xabc/2');

      // Verify the new metadata was stored
      expect(await mockStorage.get('RAW_META/0xabc/2')).toBe('d'.repeat(40));
    });

    it('should do nothing if localCache is not available', async () => {
      // Set the localCache to undefined
      (client as any)._localCache = undefined;

      // Call the method
      await client.exposedSafeSetMetadataToCache('RAW_META/0x123/1', 'test-metadata-value');

      // Verify no console messages
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    let client: MockBaseSubstrateClient;
    let mockLocalCache: MockStorage;

    beforeEach(() => {
      client = new MockBaseSubstrateClient();
      mockLocalCache = new MockStorage();

      // Set up mocks
      (client as any)._localCache = mockLocalCache;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should clear both _localCache and _apiAtCache when keepMetadataCache=false (default)', async () => {
      // Spy on cache clear methods
      const localCacheClearSpy = vi.spyOn(mockLocalCache, 'clear');
      const apiAtCacheClearSpy = vi.spyOn((client as any)._apiAtCache, 'clear');

      // Call clearCache with default parameter (false)
      await client.clearCache();

      // Verify both caches were cleared
      expect(localCacheClearSpy).toHaveBeenCalledTimes(1);
      expect(apiAtCacheClearSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear both _localCache and _apiAtCache when keepMetadataCache=false explicitly', async () => {
      // Spy on cache clear methods
      const localCacheClearSpy = vi.spyOn(mockLocalCache, 'clear');
      const apiAtCacheClearSpy = vi.spyOn((client as any)._apiAtCache, 'clear');

      // Call clearCache with explicit false parameter
      await client.clearCache(false);

      // Verify both caches were cleared
      expect(localCacheClearSpy).toHaveBeenCalledTimes(1);
      expect(apiAtCacheClearSpy).toHaveBeenCalledTimes(1);
    });

    it('should only clear _apiAtCache when keepMetadataCache=true', async () => {
      // Spy on cache clear methods
      const localCacheClearSpy = vi.spyOn(mockLocalCache, 'clear');
      const apiAtCacheClearSpy = vi.spyOn((client as any)._apiAtCache, 'clear');

      // Call clearCache with keepMetadataCache=true
      await client.clearCache(true);

      // Verify only _apiAtCache was cleared, not _localCache
      expect(localCacheClearSpy).not.toHaveBeenCalled();
      expect(apiAtCacheClearSpy).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when _localCache is undefined', async () => {
      // Set _localCache to undefined
      (client as any)._localCache = undefined;

      // Spy on _apiAtCache clear method
      const apiAtCacheClearSpy = vi.spyOn((client as any)._apiAtCache, 'clear');

      // Call clearCache - should not throw
      await expect(client.clearCache()).resolves.toBeUndefined();
      await expect(client.clearCache(true)).resolves.toBeUndefined();

      // Verify _apiAtCache was still cleared both times
      expect(apiAtCacheClearSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle _localCache.clear() throwing an error', async () => {
      // Make _localCache.clear() throw an error
      vi.spyOn(mockLocalCache, 'clear').mockRejectedValue(new Error('Cache clear failed'));

      // Spy on _apiAtCache clear method
      const apiAtCacheClearSpy = vi.spyOn((client as any)._apiAtCache, 'clear');

      // Call clearCache - should propagate the error
      await expect(client.clearCache(false)).rejects.toThrow('Cache clear failed');

      // Verify _apiAtCache was not called due to the error
      expect(apiAtCacheClearSpy).not.toHaveBeenCalled();
    });

    it('should still work when keepMetadataCache=true even if _localCache would fail', async () => {
      // Make _localCache.clear() throw an error (but it shouldn't be called)
      vi.spyOn(mockLocalCache, 'clear').mockRejectedValue(new Error('Cache clear failed'));

      // Spy on _apiAtCache clear method
      const apiAtCacheClearSpy = vi.spyOn((client as any)._apiAtCache, 'clear');

      // Call clearCache with keepMetadataCache=true - should not throw
      await expect(client.clearCache(true)).resolves.toBeUndefined();

      // Verify _apiAtCache was cleared
      expect(apiAtCacheClearSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('connect() error semantics', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not reject connect() on transient provider errors before connection', async () => {
      const client = new MockBaseSubstrateClient();
      const provider = client.provider as MockProvider;

      // Simulate a provider that hits a transient socket error first,
      // then successfully connects (e.g., retrying a different endpoint)
      vi.spyOn(provider, 'connect').mockImplementation(async () => {
        provider.emit('error', new Error('transient socket error'));
        setTimeout(() => provider.setStatus('connected'), 10);
        return provider;
      });

      await expect(client.connect()).resolves.toBe(client);
    });

    it('rejects connect() when initialization fails', async () => {
      const client = new MockBaseSubstrateClient();
      vi.spyOn(client as any, 'initialize').mockRejectedValue(new Error('init failed'));

      await expect(client.connect()).rejects.toThrow('init failed');
    });

    it('switches endpoint when initialization fails and provider retry is enabled', async () => {
      const provider = new MockWsProvider();
      const client = new MockBaseSubstrateClient(provider);

      const doInitSpy = vi
        .spyOn(client as any, 'doInitialize')
        .mockRejectedValueOnce(new Error('weird endpoint'));

      await expect(client.connect()).resolves.toBe(client);
      expect(provider.disconnectCalls).toEqual([true]);
      expect(doInitSpy).toHaveBeenCalledTimes(2);
    });

    it('does not switch endpoint when JSON-RPC v2 is not supported', async () => {
      const provider = new MockWsProvider();
      const client = new MockBaseSubstrateClient(provider);

      vi.spyOn(client as any, 'doInitialize').mockRejectedValue(new JsonRpcV2NotSupportedError('v2 not supported'));

      await expect(client.connect()).rejects.toThrow(JsonRpcV2NotSupportedError);
      expect(provider.disconnectCalls).toEqual([]);
    });

    it('rejects connect() when max retry attempts exhausted while switching endpoints', async () => {
      const provider = new MockWsProvider();
      provider.failOnSwitch = true;
      const client = new MockBaseSubstrateClient(provider);

      vi.spyOn(client as any, 'doInitialize').mockRejectedValue(new Error('weird endpoint'));

      await expect(client.connect()).rejects.toThrow(MaxRetryAttemptedError);
    });
  });
});
