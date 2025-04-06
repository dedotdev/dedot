import { describe, it, expect, vi } from 'vitest';
import { StorageQueryService } from '../StorageQueryService.js';
import { StorageData, StorageKey } from '@dedot/codecs';
import { Callback, Unsub } from '@dedot/types';

// Create a concrete implementation of the abstract class for testing
class TestStorageQueryService extends StorageQueryService<any, any, any> {
  constructor() {
    // Create a mock client
    const mockClient = {
      rpcVersion: 'test',
      registry: {},
    } as any;
    
    super(mockClient);
  }
  
  // Implement the abstract methods
  async query(keys: StorageKey[]): Promise<Record<StorageKey, StorageData | undefined>> {
    const result: Record<StorageKey, StorageData | undefined> = {};
    keys.forEach(key => {
      result[key] = 'test-value' as any;
    });
    return result;
  }
  
  async subscribe(keys: StorageKey[], callback: Callback<Record<StorageKey, StorageData | undefined>>): Promise<Unsub> {
    // Create a result map
    const result: Record<StorageKey, StorageData | undefined> = {};
    keys.forEach(key => {
      result[key] = 'test-value' as any;
    });
    
    // Call the callback with the test values
    callback(result);
    
    // Return a mock unsubscribe function
    return async () => {
      // Do nothing
    };
  }
}

describe('StorageQueryService', () => {
  it('should be instantiable with a concrete implementation', () => {
    const service = new TestStorageQueryService();
    expect(service).toBeInstanceOf(StorageQueryService);
  });
  
  it('should have query and subscribe methods', () => {
    const service = new TestStorageQueryService();
    expect(typeof service.query).toBe('function');
    expect(typeof service.subscribe).toBe('function');
  });
  
  it('query method should return a record of key-value pairs', async () => {
    const service = new TestStorageQueryService();
    const keys = ['0x01', '0x02'] as StorageKey[];
    
    const result = await service.query(keys);
    
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBe(keys.length);
    expect(result[keys[0]]).toBe('test-value');
    expect(result[keys[1]]).toBe('test-value');
  });
  
  it('subscribe method should call the callback with a record of key-value pairs', async () => {
    const service = new TestStorageQueryService();
    const keys = ['0x01', '0x02'] as StorageKey[];
    const callback = vi.fn();
    
    const unsub = await service.subscribe(keys, callback);
    
    expect(callback).toHaveBeenCalledTimes(1);
    
    // Verify the callback was called with a record containing the expected keys and values
    const expectedResult: Record<StorageKey, StorageData | undefined> = {};
    keys.forEach(key => {
      expectedResult[key] = 'test-value' as any;
    });
    expect(callback).toHaveBeenCalledWith(expectedResult);
    
    expect(typeof unsub).toBe('function');
  });
  
  it('unsubscribe function should be callable', async () => {
    const service = new TestStorageQueryService();
    const keys = ['0x01'] as StorageKey[];
    const callback = vi.fn();
    
    const unsub = await service.subscribe(keys, callback);
    
    // Should not throw
    await expect(unsub()).resolves.not.toThrow();
  });
});
