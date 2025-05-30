import { BlockHash, StorageData, StorageKey } from '@dedot/codecs';
import type { Callback, RpcVersion, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import type { SubstrateApi } from '../chaintypes/index.js';
import { BaseSubstrateClient } from '../client/BaseSubstrateClient.js';

/**
 * @name BaseStorageQuery
 * @description
 * An abstract service that provides functionality for querying and subscribing to
 * multiple storage items. This service is designed to be extended by version-specific
 * implementations that handle the details of interacting with different JSON-RPC APIs.
 * 
 * The service provides a simple interface for:
 * - Querying multiple storage keys in a single call
 * - Subscribing to changes in multiple storage keys
 * 
 * This abstraction eliminates code duplication between different client implementations
 * and provides a consistent interface for storage operations.
 */
export abstract class BaseStorageQuery<
  Rv extends RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  T extends BaseSubstrateClient<Rv, ChainApi> = BaseSubstrateClient<Rv, ChainApi>
> {
  /**
   * @param client - The substrate client instance
   */
  constructor(protected client: T) {}

  /**
   * Query multiple storage items in a single call
   * 
   * @param keys - Array of storage keys to query
   * @param at - Optional block hash to query at
   * @returns Promise resolving to a record mapping storage keys to their values
   */
  abstract query(keys: StorageKey[], at?: BlockHash): Promise<Record<StorageKey, StorageData | undefined>>;
  
  /**
   * Subscribe to multiple storage items
   * 
   * @param keys - Array of storage keys to subscribe to
   * @param callback - Function to call when storage values change
   * @returns Promise resolving to an unsubscribe function
   */
  abstract subscribe(keys: StorageKey[], callback: Callback<Record<StorageKey, StorageData | undefined>>): Promise<Unsub>;
}
