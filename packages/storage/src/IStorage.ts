/**
 * Generic storage interface for persistent key-value data storage.
 *
 * This interface provides an abstraction layer for storage mechanisms used by Dedot clients,
 * primarily for caching blockchain metadata to improve performance and reduce network calls.
 */
export interface IStorage {
  /**
   * Retrieves a value from storage by its key.
   *
   * @param key - The storage key to look up
   * @returns A promise that resolves to the stored value, or null if the key doesn't exist
   */
  get(key: string): Promise<string | null>;

  /**
   * Stores a key-value pair in the storage.
   *
   * @param key - The storage key to set
   * @param value - The string value to store
   * @returns A promise that resolves to the stored value
   * @throws May throw if storage quota is exceeded or storage is unavailable
   */
  set(key: string, value: string): Promise<string>;

  /**
   * Removes a specific key and its value from storage.
   *
   * @param key - The storage key to remove
   * @returns A promise that resolves when the removal is complete
   */
  remove(key: string): Promise<void>;

  /**
   * Removes all keys and values from storage.
   */
  clear(): Promise<void>;

  /**
   * Returns the number of key-value pairs currently in storage.
   */
  length(): Promise<number>;

  /**
   * Returns an array of all keys currently in storage.
   *
   * @returns A promise that resolves to an array of storage keys
   */
  keys(): Promise<string[]>;
}
