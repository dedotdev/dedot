import { describe, it, expect, vi } from 'vitest';
import { StorageQueryService } from '../StorageQueryService.js';
import { StorageKey } from '@dedot/codecs';
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
  async query(keys: StorageKey[]): Promise<any[]> {
    return keys.map(() => 'test-value');
  }
  
  async subscribe(keys: StorageKey[], callback: Callback<any[]>): Promise<Unsub> {
    // Call the callback with some test values
    callback(keys.map(() => 'test-value'));
    
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
  
  it('query method should return an array of values', async () => {
    const service = new TestStorageQueryService();
    const keys = ['0x01', '0x02'] as StorageKey[];
    
    const result = await service.query(keys);
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(keys.length);
    expect(result[0]).toBe('test-value');
  });
  
  it('subscribe method should call the callback with values', async () => {
    const service = new TestStorageQueryService();
    const keys = ['0x01', '0x02'] as StorageKey[];
    const callback = vi.fn();
    
    const unsub = await service.subscribe(keys, callback);
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(keys.map(() => 'test-value'));
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
