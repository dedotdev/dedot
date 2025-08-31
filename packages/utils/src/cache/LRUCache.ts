// Inspired by: https://github.com/polkadot-js/api/blob/master/packages/rpc-provider/src/lru.ts

export const DEFAULT_CAPACITY = 1024;
export const DEFAULT_TTL = 30000; // 30 seconds
const MAX_TTL = 1800_000; // 30 minutes

// If the user decides to disable the TTL we set the value
// to a very high number (A year = 365 * 24 * 60 * 60 * 1000).
const DISABLED_TTL = 31_536_000_000;

class LRUNode {
  readonly key: string;
  #expires: number;
  #ttl: number;
  readonly createdAt: number;

  public next: LRUNode;
  public prev: LRUNode;

  constructor(key: string, ttl: number) {
    this.key = key;
    this.#ttl = ttl;
    this.#expires = Date.now() + ttl;
    this.createdAt = Date.now();
    this.next = this.prev = this;
  }

  public refresh(): void {
    this.#expires = Date.now() + this.#ttl;
  }

  public get expiry(): number {
    return this.#expires;
  }
}

/**
 * LRU (Least Recently Used) cache implementation with TTL support.
 *
 * This cache automatically evicts the least recently used items when capacity is reached,
 * and also supports time-to-live (TTL) based expiration for cached items.
 *
 * @see https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU
 */
export class LRUCache {
  readonly capacity: number;

  readonly #data = new Map<string, unknown>();
  readonly #refs = new Map<string, LRUNode>();

  #length = 0;
  #head: LRUNode;
  #tail: LRUNode;

  readonly #ttl: number;

  /**
   * Creates a new LRU cache instance
   *
   * @param capacity - Maximum number of items to store (default: 1024)
   * @param ttl - Time to live in milliseconds (default: 30000ms, null to disable)
   * @throws {Error} If capacity is not a non-negative integer
   * @throws {Error} If ttl is not within valid range (0 to 1800000ms) or null
   */
  constructor(capacity = DEFAULT_CAPACITY, ttl: number | null = DEFAULT_TTL) {
    // Validate capacity
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new Error(
        `LRUCache initialization error: 'capacity' must be a non-negative integer. Received: ${capacity}`,
      );
    }

    // Validate ttl
    if (ttl !== null && (!Number.isFinite(ttl) || ttl < 0 || ttl > MAX_TTL)) {
      throw new Error(
        `LRUCache initialization error: 'ttl' must be between 0 and ${MAX_TTL} ms or null to disable. Received: ${ttl}`,
      );
    }

    this.capacity = capacity;
    this.#ttl = ttl === null ? DISABLED_TTL : ttl;
    this.#head = this.#tail = new LRUNode('<empty>', this.#ttl);
  }

  /**
   * Gets the configured TTL value
   */
  get ttl(): number | null {
    return this.#ttl === DISABLED_TTL ? null : this.#ttl;
  }

  /**
   * Gets the current number of items in the cache
   */
  get length(): number {
    return this.#length;
  }

  /**
   * Returns all entries in the cache as [key, value] pairs
   * Entries are returned in order from most to least recently used
   */
  entries(): [string, unknown][] {
    const keys = this.keys();
    const count = keys.length;
    const entries = new Array<[string, unknown]>(count);

    for (let i = 0; i < count; i++) {
      const key = keys[i];
      entries[i] = [key, this.#data.get(key)];
    }

    return entries;
  }

  /**
   * Returns all keys in the cache
   * Keys are returned in order from most to least recently used
   */
  keys(): string[] {
    const keys: string[] = [];

    if (this.#length) {
      let curr = this.#head;

      while (curr !== this.#tail) {
        keys.push(curr.key);
        curr = curr.next;
      }

      keys.push(curr.key);
    }

    return keys;
  }

  /**
   * Gets a value from the cache
   *
   * @param key - The key to retrieve
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    // First evict expired items
    this.#evictTTL();

    const data = this.#data.get(key);

    if (data) {
      this.#toHead(key);
      return data as T;
    }

    return null;
  }

  /**
   * Sets a value in the cache
   *
   * @param key - The key to set
   * @param value - The value to cache
   */
  set<T>(key: string, value: T): void {
    // If capacity is 0, don't store anything
    if (this.capacity === 0) {
      return;
    }

    if (this.#data.has(key)) {
      this.#toHead(key);
    } else {
      const node = new LRUNode(key, this.#ttl);

      this.#refs.set(node.key, node);

      if (this.length === 0) {
        this.#head = this.#tail = node;
      } else {
        this.#head.prev = node;
        node.next = this.#head;
        this.#head = node;
      }

      if (this.#length === this.capacity) {
        this.#data.delete(this.#tail.key);
        this.#refs.delete(this.#tail.key);

        this.#tail = this.#tail.prev;
        this.#tail.next = this.#head;
      } else {
        this.#length += 1;
      }
    }

    // Evict TTL once data is refreshed or added
    this.#evictTTL();

    this.#data.set(key, value);
  }

  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.#data.clear();
    this.#refs.clear();
    this.#length = 0;
    this.#head = this.#tail = new LRUNode('<empty>', this.#ttl);
  }

  /**
   * Checks if a key exists in the cache
   *
   * @param key - The key to check
   * @returns true if the key exists and hasn't expired
   */
  has(key: string): boolean {
    // First evict expired items
    this.#evictTTL();

    // Then check if the key exists
    return this.#data.has(key);
  }

  /**
   * Deletes a specific key from the cache
   *
   * @param key - The key to delete
   * @returns true if the key was deleted, false if not found
   */
  delete(key: string): boolean {
    const node = this.#refs.get(key);
    if (!node) return false;

    // Remove from data and refs
    this.#data.delete(key);
    this.#refs.delete(key);

    // Update linked list
    if (this.#length === 1) {
      this.#head = this.#tail = new LRUNode('<empty>', this.#ttl);
    } else if (node === this.#head) {
      this.#head = node.next;
      this.#head.prev = this.#tail;
      this.#tail.next = this.#head;
    } else if (node === this.#tail) {
      this.#tail = node.prev;
      this.#tail.next = this.#head;
      this.#head.prev = this.#tail;
    } else {
      node.prev.next = node.next;
      node.next.prev = node.prev;
    }

    this.#length -= 1;
    return true;
  }

  #evictTTL(): void {
    if (this.#ttl === DISABLED_TTL) {
      return; // TTL is disabled, no eviction needed
    }

    const now = Date.now();
    // We need to check all nodes, not just from the tail
    // because items can be accessed in any order
    const keysToDelete: string[] = [];

    for (const [key, node] of this.#refs) {
      if (node.expiry < now) {
        keysToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of keysToDelete) {
      const node = this.#refs.get(key);
      if (!node) continue;

      this.#refs.delete(key);
      this.#data.delete(key);
      this.#length -= 1;

      // Update linked list
      if (this.#length === 0) {
        this.#head = this.#tail = new LRUNode('<empty>', this.#ttl);
      } else if (node === this.#head) {
        this.#head = node.next;
        this.#head.prev = this.#tail;
        this.#tail.next = this.#head;
      } else if (node === this.#tail) {
        this.#tail = node.prev;
        this.#tail.next = this.#head;
        this.#head.prev = this.#tail;
      } else {
        node.prev.next = node.next;
        node.next.prev = node.prev;
      }
    }
  }

  #toHead(key: string): void {
    const ref = this.#refs.get(key);

    if (ref && ref !== this.#head) {
      ref.refresh();

      if (ref === this.#tail) {
        this.#tail = ref.prev;
        this.#tail.next = this.#head;
      } else {
        ref.prev.next = ref.next;
        ref.next.prev = ref.prev;
      }

      ref.next = this.#head;
      ref.prev = this.#tail;
      this.#head.prev = ref;
      this.#head = ref;
    } else if (ref === this.#head) {
      ref.refresh();
    }
  }
}
