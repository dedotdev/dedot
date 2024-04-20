import { describe, it, beforeEach, expect, vi } from 'vitest';
import { LocalStorage } from '../LocalStorage.js';

describe('LocalStorage', () => {
  let storage: LocalStorage;

  beforeEach(() => {
    storage = new LocalStorage();
    localStorage.clear();
  });

  it('should set and get an item', async () => {
    localStorage.setItem('test', 'another-value');
    await storage.set('test', 'value');
    const result = await storage.get('test');
    expect(result).toBe('value');
  });

  it('should remove an item', async () => {
    await storage.set('test', 'value');
    await storage.remove('test');
    const result = await storage.get('test');
    expect(result).toBeNull();
  });

  it('should clear all items', async () => {
    await storage.set('test1', 'value1');
    await storage.set('test2', 'value2');
    await storage.clear();
    const result1 = await storage.get('test1');
    const result2 = await storage.get('test2');
    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it('should return all keys', async () => {
    await storage.set('test1', 'value1');
    await storage.set('test2', 'value2');
    localStorage.setItem('test3', 'value3');

    const keys = await storage.keys();
    expect(keys.length).toEqual(2);
    expect(keys).toContain('test1');
    expect(keys).toContain('test2');
  });

  it('should return correct length', async () => {
    await storage.set('test1', 'value1');
    await storage.set('test2', 'value2');
    localStorage.setItem('test3', 'value3');

    const length = await storage.length();
    expect(length).toBe(2);
  });

  it('should throw an error if localStorage is not available', () => {
    // @ts-ignore
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => null);
    expect(() => new LocalStorage()).toThrow('localStorage is not available!');
  });
});
