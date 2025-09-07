import { BlockHash, StorageData, StorageKey } from '@dedot/codecs';
import type { Callback, Unsub } from '@dedot/types';
import { AsyncQueue, noop } from '@dedot/utils';
import { DedotClient } from '../client/DedotClient.js';
import { PinnedBlock } from '../json-rpc/group/ChainHead/ChainHead.js';
import { BaseStorageQuery } from './BaseStorageQuery.js';

/**
 * @name NewStorageQuery
 * @description
 * Implementation of BaseStorageQuery for the new JSON-RPC API (v2).
 * This service handles storage queries using the chainHead_storage RPC method
 * and chainHead events for subscriptions.
 *
 * It provides:
 * - One-time queries using chainHead_storage
 * - Subscriptions using chainHead 'bestBlock' events
 * - Efficient change detection for subscriptions
 */
export class NewStorageQuery extends BaseStorageQuery {
  constructor(protected client: DedotClient<any>) {
    super(client);
  }

  /**
   * Query multiple storage items in a single call using chainHead_storage
   *
   * @param keys - Array of storage keys to query
   * @param at - Optional block hash to query at (defaults to best block)
   * @returns Promise resolving to a record mapping storage keys to their values
   */
  async query(keys: StorageKey[], at?: BlockHash): Promise<Record<StorageKey, StorageData | undefined>> {
    // Query storage using ChainHead API
    const storageQueries = keys.map((key) => ({ type: 'value' as const, key }));

    // Use the provided block hash or skip it in tests
    const rawResults = at
      ? await this.client.chainHead.storage(storageQueries, undefined, at)
      : await this.client.chainHead.storage(storageQueries);

    // Create a map of key -> value for easy lookup
    const results: Record<StorageKey, StorageData | undefined> = {};

    // Initialize all keys with undefined
    keys.forEach((key) => (results[key] = undefined));

    // Update with actual values from the response
    rawResults.forEach((result) => {
      results[result.key as StorageKey] = (result.value as StorageData) ?? undefined;
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
    // Using a queue here to make sure we don't accidentally
    // put a pressure the json-rpc server in-case new blocks stack up too fast
    // in case we send a lot of requests at the same time
    // or the block time is small enough with elastic scaling
    const pullQueue = new AsyncQueue();

    // Function to pull storage values and call the callback if there are changes
    const pull = async ({ hash }: PinnedBlock) => {
      // Query storage using ChainHead API
      const storageQueries = keys.map((key) => ({ type: 'value' as const, key }));
      const rawResults = await this.client.chainHead.storage(storageQueries, undefined, hash);

      let changed = false;

      // Create a map for easy lookup
      const results: Record<StorageKey, StorageData | undefined> = {};
      rawResults.forEach((result) => {
        results[result.key as StorageKey] = (result.value as StorageData) ?? undefined;
      });

      keys.forEach((key) => {
        const newValue = results[key];
        if (Object.keys(latestChanges).length > 0 && latestChanges[key] === newValue) return;

        changed = true;
        latestChanges[key] = newValue;
      });

      if (!changed) return;

      callback({ ...latestChanges });
    };

    // Initial pull
    await pull(best);

    // Subscribe to best block events
    const unsub = this.client.on('bestBlock', (block: PinnedBlock) => {
      // Here we're handling each pull one by one,
      // If the queue get too long, it might take a long time for us to get the fresh & latest data
      // This is a precaution in such case, if the queue size >= 3 we skip all the pending pull and jump to the latest pull
      if (pullQueue.size >= 3) pullQueue.clear();

      // TODO timing out for a pull to prevent it took too long to fetch
      pullQueue.enqueue(() => pull(block)).catch(noop);
    });

    return async () => {
      unsub();
      pullQueue.cancel();
    };
  }
}
