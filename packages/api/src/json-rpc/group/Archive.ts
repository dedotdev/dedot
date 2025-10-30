import { BlockHash, Option } from '@dedot/codecs';
import { Callback, Unsub } from '@dedot/types';
import {
  ArchiveStorageEventType,
  ArchiveStorageResult,
  MethodResult,
  PaginatedStorageQuery,
} from '@dedot/types/json-rpc';
import { DedotError, HexString, LRUCache } from '@dedot/utils';
import { IJsonRpcClient } from '../../types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';

const ARCHIVE_CACHE_CAPACITY = 256;
const ARCHIVE_CACHE_TTL = 60_000; // 1 minutes - archive data is immutable

/**
 * @name Archive
 * Archive JSON-RPC methods for accessing historical blockchain data.
 * Functions with the `archive` prefix allow obtaining the state of the chain
 * at any point in the present or in the past.
 *
 * JSON-RPC V2: https://paritytech.github.io/json-rpc-interface-spec/api/archive.html
 */
export class Archive extends JsonRpcGroup {
  #genesisHash?: HexString;
  #cache: LRUCache;

  constructor(client: IJsonRpcClient<any>, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'archive', supportedVersions: ['unstable', 'v1'], ...options });
    this.#cache = new LRUCache(ARCHIVE_CACHE_CAPACITY, ARCHIVE_CACHE_TTL);
  }

  /**
   * Retrieves the body (list of transactions) of a given block.
   * Returns an array of strings containing the hexadecimal-encoded SCALE-codec-encoded
   * transactions in that block. If no block with that hash is found, null.
   *
   * @param hash - The block hash (optional, defaults to current finalized block)
   * @returns Array of transaction hashes or null if block not found
   *
   * @example
   * ```typescript
   * // Get transactions from current finalized block
   * const transactions = await archive.body();
   *
   * // Get transactions from specific block
   * const transactions = await archive.body('0x1234...');
   * ```
   */
  async body(hash?: BlockHash): Promise<Option<Array<HexString>>> {
    const blockHash = hash || (await this.finalizedHash());
    const cacheKey = `${blockHash}::body`;

    const cached = this.#cache.get<Option<Array<HexString>>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.send('body', blockHash);
    this.#cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get the chain's genesis hash.
   * Returns a string containing the hexadecimal-encoded hash of the genesis block of the chain.
   * This value is cached after the first call.
   *
   * @returns The genesis block hash
   */
  async genesisHash(): Promise<HexString> {
    if (!this.#genesisHash) {
      this.#genesisHash = await this.send('genesisHash');
    }
    return this.#genesisHash;
  }

  /**
   * Get the block's header.
   * Returns a string containing the hexadecimal-encoded SCALE-codec encoding header of the block.
   *
   * @param hash - The block hash (optional, defaults to current finalized block)
   * @returns The encoded block header or null if block not found
   *
   * @example
   * ```typescript
   * // Get header of current finalized block
   * const header = await archive.header();
   *
   * // Get header of specific block
   * const header = await archive.header('0x1234...');
   * ```
   */
  async header(hash?: BlockHash): Promise<Option<HexString>> {
    const blockHash = hash || (await this.finalizedHash());
    const cacheKey = `${blockHash}::header`;

    const cached = this.#cache.get<Option<HexString>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await this.send('header', blockHash);
    this.#cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get the height of the current finalized block.
   * Returns an integer height of the current finalized block of the chain.
   *
   * @returns The height of the finalized block
   */
  async finalizedHeight(): Promise<number> {
    return this.send('finalizedHeight');
  }

  /**
   * Get the hash of the current finalized block.
   * Returns a string containing the hexadecimal-encoded hash of the current finalized block.
   * This is a convenience method that combines finalizedHeight() and hashByHeight().
   *
   * @returns The hash of the current finalized block
   */
  async finalizedHash(): Promise<HexString> {
    const height = await this.finalizedHeight();
    const hashes = await this.hashByHeight(height);

    if (hashes.length === 0) {
      throw new Error(`No block found at finalized height ${height}`);
    }

    return hashes[0];
  }

  /**
   * Get the hashes of blocks from the given height.
   * Returns an array (possibly empty) of strings containing hexadecimal-encoded hashes of block headers.
   *
   * Note: For heights <= finalized height, there is guaranteed to be one block.
   * For heights > finalized height, there may be zero, one or multiple blocks depending on forks.
   *
   * @param height - The block height
   * @returns Array of block hashes at the given height
   */
  async hashByHeight(height: number): Promise<Array<HexString>> {
    return this.send('hashByHeight', height);
  }

  /**
   * Call into the Runtime API at a specified block's state.
   *
   * @param func - The runtime API function to call
   * @param params - The parameters for the function call (SCALE-encoded)
   * @param hash - The block hash (optional, defaults to current finalized block)
   * @returns The result of the runtime call
   *
   * @example
   * ```typescript
   * // Call Core_version on current finalized block
   * const version = await archive.call('Core_version', '0x');
   *
   * // Call Core_version on specific block
   * const version = await archive.call('Core_version', '0x', '0x1234...');
   * ```
   */
  async call(func: string, params: HexString, hash?: BlockHash): Promise<HexString> {
    const blockHash = hash || (await this.finalizedHash());
    const cacheKey = `${blockHash}::call::${func}::${params}`;

    const cached = this.#cache.get<HexString>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result: MethodResult = await this.send('call', blockHash, func, params);
    if (!result.success) {
      throw new DedotError(result.error);
    }

    this.#cache.set(cacheKey, result.value);
    return result.value as HexString;
  }

  /**
   * Returns storage entries at a specific block's state via subscription.
   *
   * @param items - Array of storage queries with optional pagination
   * @param childTrie - Optional child trie key
   * @param callback - Callback to receive storage events
   * @param hash - The block hash (optional, defaults to current finalized block)
   * @returns Unsubscribe function
   */
  async #storageSubscription(
    items: Array<PaginatedStorageQuery>,
    childTrie: HexString | null,
    callback: Callback<ArchiveStorageEventType>,
    hash?: BlockHash,
  ): Promise<Unsub> {
    const blockHash = hash || (await this.finalizedHash());
    return this.send('storage', blockHash, items, childTrie, callback);
  }

  /**
   * Returns storage entries at a specific block's state.
   * This method collects all storage events and returns them as a single result.
   *
   * @param items - Array of storage queries with optional pagination
   * @param childTrie - Optional child trie key
   * @param hash - The block hash (optional, defaults to current finalized block)
   * @returns Storage results array
   *
   * @example
   * ```typescript
   * // Query storage from current finalized block
   * const results = await archive.storage([{ key: '0x1234', type: 'value' }]);
   *
   * // Query storage from specific block
   * const results = await archive.storage([{ key: '0x1234', type: 'value' }], null, '0xabcd...');
   * ```
   */
  async storage(
    items: Array<PaginatedStorageQuery>,
    childTrie?: HexString | null,
    hash?: BlockHash,
  ): Promise<ArchiveStorageResult> {
    return new Promise(async (resolve, reject) => {
      const results: any[] = [];
      const blockHash = hash || (await this.finalizedHash());

      // Generate cache key
      const cacheKey = `${blockHash}::storage::${JSON.stringify(items)}::${childTrie ?? null}`;

      // Check cache
      const cached = this.#cache.get<ArchiveStorageResult>(cacheKey);
      if (cached !== null) {
        return resolve(cached);
      }

      this.#storageSubscription(
        items,
        childTrie || null,
        (event) => {
          switch (event.event) {
            case 'storage':
              results.push(event);
              break;
            case 'storageDone':
              // Set cache after successful completion
              this.#cache.set(cacheKey, results);
              resolve(results);
              break;
            case 'storageError':
              reject(new DedotError(event.error));
              break;
          }
        },
        blockHash,
      ).catch(reject);
    });
  }

  /**
   * Clears the internal cache used for storing archive query results.
   * This can be useful for memory management or when you want to force fresh data retrieval.
   *
   * @example
   * ```typescript
   * // Clear all cached results
   * archive.clearCache();
   * ```
   */
  clearCache(): void {
    this.#cache.clear();
  }
}
