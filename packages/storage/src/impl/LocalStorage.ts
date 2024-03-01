import type { IStorage } from '../IStorage';

const checkAvailability = () => {
  try {
    localStorage.setItem('dedot', 'true');
    localStorage.removeItem('dedot');
  } catch {
    throw new Error('localStorage is not available!');
  }
};

/**
 * A wrapper for localStorage
 */
export class LocalStorage implements IStorage {
  constructor() {
    checkAvailability();
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<string> {
    localStorage.setItem(key, value);
    return value;
  }

  async keys(): Promise<string[]> {
    const length = localStorage.length;
    const keys: string[] = [];
    for (let idx = 0; idx < length; idx += 1) {
      const currentValue = localStorage.key(idx);
      if (currentValue) keys.push(currentValue);
    }

    return keys;
  }

  async length(): Promise<number> {
    return localStorage.length;
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
