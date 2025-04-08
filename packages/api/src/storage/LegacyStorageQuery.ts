import { BlockHash, StorageData, StorageKey } from '@dedot/codecs';
import type { Callback, RpcLegacy, Unsub, VersionedGenericSubstrateApi } from '@dedot/types';
import type { StorageChangeSet } from '@dedot/types/json-rpc';
import type { SubstrateApi } from '../chaintypes/index.js';
import { LegacyClient } from '../client/LegacyClient.js';
import { BaseStorageQuery } from './BaseStorageQuery.js';

/**
 * @name LegacyStorageQuery
 * @description
 * Implementation of BaseStorageQuery for the legacy JSON-RPC API (v1).
 * This service handles storage queries using the state_queryStorageAt and
 * state_subscribeStorage RPC methods.
 *
 * It provides:
 * - One-time queries using state_queryStorageAt
 * - Subscriptions using state_subscribeStorage
 * - Efficient change tracking for subscriptions
 */
export class LegacyStorageQuery<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // prettier-end-here
> extends BaseStorageQuery<RpcLegacy, ChainApi, LegacyClient<ChainApi>> {
  /**
   * Query multiple storage items in a single call using state_queryStorageAt
   *
   * @param keys - Array of storage keys to query
   * @param at - Optional block hash to query at (defaults to current/best block)
   * @returns Promise resolving to a record mapping storage keys to their values
   */
  async query(keys: StorageKey[], at?: BlockHash): Promise<Record<StorageKey, StorageData | undefined>> {
    const client = this.client as unknown as LegacyClient;

    // Query storage at the specified block or current block
    const changeSets = at
      ? await client.rpc.state_queryStorageAt(keys, at)
      : await client.rpc.state_queryStorageAt(keys);

    // Create a map of key -> value for easy lookup
    const results: Record<StorageKey, StorageData | undefined> = {};

    // Initialize all keys with undefined
    keys.forEach((key) => (results[key] = undefined));

    // Update with actual values from the response
    if (changeSets && changeSets.length > 0) {
      changeSets[0].changes.forEach(([key, value]) => {
        results[key] = value ?? undefined;
      });
    }

    return results;
  }

  /**
   * Subscribe to multiple storage items using state_subscribeStorage
   *
   * @param keys - Array of storage keys to subscribe to
   * @param callback - Function to call when storage values change
   * @returns Promise resolving to an unsubscribe function
   */
  async subscribe(keys: StorageKey[], callback: Callback<Record<StorageKey, StorageData | undefined>>): Promise<Unsub> {
    // Track the latest changes for each key
    const lastChanges: Record<StorageKey, StorageData | undefined> = {};

    // Initialize all keys with undefined
    keys.forEach((key) => (lastChanges[key] = undefined));

    // Subscribe to storage changes
    const client = this.client as unknown as LegacyClient;
    return client.rpc.state_subscribeStorage(keys, (changeSet: StorageChangeSet) => {
      // Update the latest changes
      changeSet.changes.forEach(([key, value]) => {
        if (lastChanges[key] !== value) {
          lastChanges[key] = value ?? undefined;
        }
      });

      // Call the callback with the updated map
      callback({ ...lastChanges });
    });
  }
}
