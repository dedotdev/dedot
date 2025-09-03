import { describe, it, beforeEach, expect } from 'vitest';
import { LRUCache, DEFAULT_CAPACITY, DEFAULT_TTL } from '../LRUCache.js';

describe('LRUCache', () => {
  let cache: LRUCache;

  beforeEach(() => {
    cache = new LRUCache();
  });

  describe('constructor', () => {
    it('should create cache with default values', () => {
      const cache = new LRUCache();
      expect(cache.capacity).toBe(DEFAULT_CAPACITY);
      expect(cache.ttl).toBe(DEFAULT_TTL);
      expect(cache.length).toBe(0);
    });

    it('should create cache with custom capacity', () => {
      const cache = new LRUCache(100);
      expect(cache.capacity).toBe(100);
    });

    it('should create cache with custom TTL', () => {
      const cache = new LRUCache(100, 5000);
      expect(cache.ttl).toBe(5000);
    });

    it('should create cache with disabled TTL', () => {
      const cache = new LRUCache(100, null);
      expect(cache.ttl).toBe(null);
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new LRUCache(-1)).toThrow('must be a non-negative integer');
      expect(() => new LRUCache(1.5)).toThrow('must be a non-negative integer');
      expect(() => new LRUCache(NaN)).toThrow('must be a non-negative integer');
    });

    it('should throw error for invalid TTL', () => {
      expect(() => new LRUCache(100, -1)).toThrow('must be between 0 and 1800000 ms');
      expect(() => new LRUCache(100, 1800001)).toThrow('must be between 0 and 1800000 ms');
      expect(() => new LRUCache(100, NaN)).toThrow('must be between 0 and 1800000 ms');
    });
  });

  describe('basic operations', () => {
    beforeEach(() => {
      cache = new LRUCache(3);
    });

    it('should set and get values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.length).toBe(2);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBe(null);
    });

    it('should update existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'updated');

      expect(cache.get('key1')).toBe('updated');
      expect(cache.length).toBe(1);
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.length).toBe(1);

      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.length).toBe(0);
      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')).toBe(null);
    });
  });

  describe('LRU eviction', () => {
    beforeEach(() => {
      cache = new LRUCache(3);
    });

    it('should evict least recently used item when capacity is reached', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.length).toBe(3);
    });

    it('should move accessed items to head', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to move it to head
      cache.get('key1');

      // Now key2 should be the tail
      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe(null);
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should handle updating existing keys without changing position', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update key1 - should move to head
      cache.set('key1', 'updated');

      // Now key2 should be the tail
      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBe(null);
    });
  });

  describe('TTL expiration', () => {
    it('should expire items after TTL', async () => {
      const cache = new LRUCache(10, 100); // 100ms TTL

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBe(null);
      expect(cache.length).toBe(0);
    });

    it('should refresh TTL on access', async () => {
      const cache = new LRUCache(10, 200); // 200ms TTL

      cache.set('key1', 'value1');

      // Wait 100ms and access
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBe('value1');

      // Wait another 150ms (total 250ms from set, but only 150ms from last access)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still be valid because we refreshed at 100ms
      expect(cache.get('key1')).toBe('value1');

      // Wait another 250ms without access
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Now it should be expired
      expect(cache.get('key1')).toBe(null);
    });

    it('should handle disabled TTL', async () => {
      const cache = new LRUCache(10, null); // Disabled TTL

      cache.set('key1', 'value1');

      // Wait some time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be valid
      expect(cache.get('key1')).toBe('value1');
    });

    it('should evict expired items when setting new items', async () => {
      const cache = new LRUCache(10, 100); // 100ms TTL

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Wait for items to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Set a new item - should trigger eviction of expired items
      cache.set('key3', 'value3');

      expect(cache.length).toBe(1);
      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')).toBe(null);
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('keys and entries', () => {
    beforeEach(() => {
      cache = new LRUCache(5);
    });

    it('should return keys in LRU order', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.keys()).toEqual(['key3', 'key2', 'key1']);

      // Access key1 to move it to head
      cache.get('key1');

      expect(cache.keys()).toEqual(['key1', 'key3', 'key2']);
    });

    it('should return entries in LRU order', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.entries()).toEqual([
        ['key3', 'value3'],
        ['key2', 'value2'],
        ['key1', 'value1'],
      ]);

      // Access key1 to move it to head
      cache.get('key1');

      expect(cache.entries()).toEqual([
        ['key1', 'value1'],
        ['key3', 'value3'],
        ['key2', 'value2'],
      ]);
    });

    it('should return empty arrays when cache is empty', () => {
      expect(cache.keys()).toEqual([]);
      expect(cache.entries()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle capacity of 0', () => {
      const cache = new LRUCache(0);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe(null);
      expect(cache.length).toBe(0);
    });

    it('should handle capacity of 1', () => {
      const cache = new LRUCache(1);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      cache.set('key2', 'value2');
      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')).toBe('value2');
      expect(cache.length).toBe(1);
    });

    it('should handle deleting from single-item cache', () => {
      const cache = new LRUCache(5);

      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.length).toBe(0);
      expect(cache.keys()).toEqual([]);
    });

    it('should handle deleting head', () => {
      const cache = new LRUCache(5);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.delete('key3')).toBe(true); // Delete head
      expect(cache.keys()).toEqual(['key2', 'key1']);
    });

    it('should handle deleting tail', () => {
      const cache = new LRUCache(5);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.delete('key1')).toBe(true); // Delete tail
      expect(cache.keys()).toEqual(['key3', 'key2']);
    });

    it('should handle deleting middle node', () => {
      const cache = new LRUCache(5);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.delete('key2')).toBe(true); // Delete middle
      expect(cache.keys()).toEqual(['key3', 'key1']);
    });
  });

  describe('type safety', () => {
    it('should handle typed values', () => {
      interface User {
        id: number;
        name: string;
      }

      const cache = new LRUCache(10);
      const user: User = { id: 1, name: 'Alice' };

      cache.set('user1', user);

      const retrieved = cache.get<User>('user1');
      expect(retrieved).toEqual(user);
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe('Alice');
    });

    it('should handle various data types', () => {
      const cache = new LRUCache(10);

      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('array', [1, 2, 3]);
      cache.set('object', { foo: 'bar' });
      cache.set('null', null);
      // Note: undefined values cannot be distinguished from missing values

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('null')).toBe(null);
      // undefined test removed as it cannot be distinguished from null return
    });
  });
});
