import type { IStorage } from '../IStorage.js';

const checkAvailability = () => {
  try {
    localStorage.setItem('dedot', 'true');
    localStorage.removeItem('dedot');
  } catch {
    throw new Error('localStorage is not available!');
  }
};

const DEFAULT_PREFIX: string = 'dedot:';

/**
 * A wrapper for localStorage
 */
export class LocalStorage implements IStorage {
  constructor(public prefix: string = DEFAULT_PREFIX) {
    checkAvailability();
  }

  async clear(): Promise<void> {
    const length = localStorage.length;
    const keysToRemove = [];

    for (let idx = 0; idx < length; idx += 1) {
      const key = localStorage.key(idx);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(this.#getPrefixedKey(key));
  }

  #getPrefixedKey(key: string): string {
    return key.startsWith(DEFAULT_PREFIX) ? key : `${this.prefix}${key}`;
  }

  async set(key: string, value: string): Promise<string> {
    localStorage.setItem(this.#getPrefixedKey(key), value);
    return value;
  }

  async keys(): Promise<string[]> {
    const length = localStorage.length;
    const keys: string[] = [];
    for (let idx = 0; idx < length; idx += 1) {
      const key = localStorage.key(idx);
      if (key?.startsWith(this.prefix)) keys.push(key.substring(this.prefix.length));
    }

    return keys;
  }

  async length(): Promise<number> {
    return (await this.keys()).length;
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.#getPrefixedKey(key));
  }
}
