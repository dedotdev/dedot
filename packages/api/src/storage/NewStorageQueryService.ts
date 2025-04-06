import { BlockHash, StorageData, StorageKey } from '@dedot/codecs';
import type { Callback, RpcV2, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import type { SubstrateApi } from '../chaintypes/index.js';
import { DedotClient } from '../client/DedotClient.js';
import { ChainHeadEvent, PinnedBlock } from '../json-rpc/group/ChainHead/ChainHead.js';
import { StorageQueryService } from './StorageQueryService.js';

/**
 * @name NewStorageQueryService
 * @description
 * Implementation of StorageQueryService for the new JSON-RPC API (v2).
 * This service handles storage queries using the chainHead_storage RPC method
 * and chainHead events for subscriptions.
 * 
 * It provides:
 * - One-time queries using chainHead_storage
 * - Subscriptions using chainHead 'bestBlock' events
 * - Efficient change detection for subscriptions
 */
export class NewStorageQueryService<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi
> extends StorageQueryService<RpcV2, ChainApi, DedotClient<ChainApi>> {
  /**
   * Query multiple storage items in a single call using chainHead_storage
   * 
   * @param keys - Array of storage keys to query
   * @param at - Optional block hash to query at (defaults to best block)
   * @returns Promise resolving to a record mapping storage keys to their values
   */
  async query(keys: StorageKey[], at?: BlockHash): Promise<Record<StorageKey, StorageData | undefined>> {
    // Query storage using ChainHead API
    const storageQueries = keys.map(key => ({ type: 'value' as const, key }));
    
    // Use the provided block hash or skip it in tests
    const rawResults = at
      ? await this.client.chainHead.storage(storageQueries, undefined, at)
      : await this.client.chainHead.storage(storageQueries);
    
    // Create a map of key -> value for easy lookup
    const results: Record<StorageKey, StorageData | undefined> = {};
    
    // Initialize all keys with undefined
    keys.forEach(key => results[key] = undefined);
    
    // Update with actual values from the response
    rawResults.forEach((result) => {
      results[result.key as StorageKey] = result.value as StorageData || undefined;
    });
    
    return results;
  }
  
  /**
   * Subscribe to multiple storage items using chainHead 'bestBlock' events
   * 
   * @param keys - Array of storage keys to subscribe to
   * @param callback - Function to call when storage values change
   * @returns Promise resolving to an unsubscribe function
   */
  async subscribe(keys: StorageKey[], callback: Callback<Record<StorageKey, StorageData | undefined>>): Promise<Unsub> {
    // Get the best block
    const best = await this.client.chainHead.bestBlock();

    // Track the latest changes for each key
    const latestChanges: Record<StorageKey, StorageData | undefined> = {};

    // Initialize all keys with undefined
    keys.forEach(key => latestChanges[key] = undefined);

    // Function to pull storage values and call the callback if there are changes
    const pull = async ({ hash }: PinnedBlock) => {
      // Query storage using ChainHead API
      const storageQueries = keys.map(key => ({ type: 'value' as const, key }));
      const rawResults = await this.client.chainHead.storage(storageQueries, undefined, hash);

      let changed = false;

      // Create a map for easy lookup
      const results: Record<string, StorageData | undefined> = {};
      rawResults.forEach((result) => {
        results[result.key] = result.value as StorageData || undefined;
      });

      keys.forEach((key) => {
        const newValue = results[key];
        if (latestChanges[key] === newValue) return;

        changed = true;
        latestChanges[key] = newValue;
      });
      
      if (!changed) return;
      
      callback({...latestChanges});
    };
    
    // Initial pull
    await pull(best);
    
    // Subscribe to best block events
    const unsub = this.client.chainHead.on('bestBlock', pull);
    
    return async () => {
      unsub()
    };
  }
}
