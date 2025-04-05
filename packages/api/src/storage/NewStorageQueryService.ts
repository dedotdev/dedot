import { StorageKey } from '@dedot/codecs';
import type { Callback, RpcV2, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import type { SubstrateApi } from '../chaintypes/index.js';
import { DedotClient } from '../client/DedotClient.js';
import { PinnedBlock } from '../json-rpc/group/ChainHead/ChainHead.js';
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
   * @returns Promise resolving to an array of raw values in the same order as the keys
   */
  async query(keys: StorageKey[]): Promise<any[]> {
    // Query storage using ChainHead API
    const storageQueries = keys.map(key => ({ type: 'value' as const, key }));
    const results = await this.client.chainHead.storage(storageQueries);
    
    // Create a map of key -> value for easy lookup
    const resultsMap = new Map<string, any>();
    results.forEach((result) => {
      resultsMap.set(result.key, result.value);
    });
    
    // Return values in the same order as keys
    return keys.map(key => resultsMap.get(key));
  }
  
  /**
   * Subscribe to multiple storage items using chainHead 'bestBlock' events
   * 
   * @param keys - Array of storage keys to subscribe to
   * @param callback - Function to call when storage values change
   * @returns Promise resolving to an unsubscribe function
   */
  async subscribe(keys: StorageKey[], callback: Callback<any[]>): Promise<Unsub> {
    // Get the best block
    const best = await this.client.chainHead.bestBlock();
    
    // Track the latest changes for each key
    const latestChanges = new Map<string, any>();

    // Function to pull storage values and call the callback if there are changes
    const pull = async ({ hash }: PinnedBlock) => {
      // Query storage using ChainHead API
      const storageQueries = keys.map(key => ({ type: 'value' as const, key }));
      const results = await this.client.chainHead.storage(storageQueries, undefined, hash);
      
      let changed = false;
      
      // Check for changes
      results.forEach((result) => {
        const key = result.key;
        const value = result.value;
        
        if (latestChanges.size > 0 && latestChanges.get(key) === value) return;
        
        changed = true;
        latestChanges.set(key, value);
      });
      
      if (!changed) return;
      
      // Return values in the same order as keys
      const values = keys.map(key => latestChanges.get(key));
      callback(values);
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
