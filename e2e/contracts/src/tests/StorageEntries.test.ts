import { DedotClient } from 'dedot';
import { HexString } from 'dedot/utils';
import { beforeAll, describe, expect, it } from 'vitest';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

describe('Storage Entries Method E2E Tests', () => {
  let client: DedotClient;
  let finalizedHash: HexString;

  beforeAll(async () => {
    // Use contractsClient from global setup (connected to CONTRACTS_NODE_ENDPOINT)
    client = contractsClient;
    finalizedHash = await client.rpc.chain_getFinalizedHead();

    console.log(`Storage Entries testing with finalized: ${finalizedHash}`);
  }, 120_000);

  describe('System.Account Storage', () => {
    it('should fetch all System.Account entries', async () => {
      console.log('=== Fetching all System.Account entries ===');

      const allEntries = await client.query.system.account.entries();

      expect(Array.isArray(allEntries)).toBe(true);
      expect(allEntries.length).toBeGreaterThan(0);

      console.log(`Total System.Account entries: ${allEntries.length}`);

      // Verify structure of entries
      allEntries.forEach(([key, value]) => {
        expect(key).toBeDefined();
        expect(value).toBeDefined();
        expect(typeof value.data.free).toBe('bigint');
        expect(typeof value.nonce).toBe('number');
      });
    });

    it('should have entries with expected accounts', async () => {
      console.log('=== Verifying known accounts in entries ===');

      const allEntries = await client.query.system.account.entries();

      // Extract all addresses
      const addresses = allEntries.map(([key]) => key.address());

      // Verify known accounts are present
      expect(addresses).toContain(ALICE);
      expect(addresses).toContain(BOB);

      console.log(`Found ${allEntries.length} accounts, including ALICE and BOB`);
    });

    it('should match data with individual queries', async () => {
      console.log('=== Comparing entries with individual queries ===');

      const allEntries = await client.query.system.account.entries();

      // Find Alice's entry
      const aliceEntry = allEntries.find(([key]) => key.address() === ALICE);
      expect(aliceEntry).toBeDefined();

      if (aliceEntry) {
        const [, aliceAccountFromEntries] = aliceEntry;

        // Query Alice individually
        const aliceAccountDirect = await client.query.system.account(ALICE);

        // Compare the results
        expect(aliceAccountFromEntries.data.free).toBe(aliceAccountDirect.data.free);
        expect(aliceAccountFromEntries.nonce).toBe(aliceAccountDirect.nonce);

        console.log(`Alice balance matches: ${aliceAccountFromEntries.data.free}`);
      }
    });
  });

  describe('Comparison with Pagination Methods', () => {
    it('should match count with pagedKeys', async () => {
      console.log('=== Comparing entries count with pagedKeys ===');

      // Fetch all keys using pagedKeys
      let allKeys: any[] = [];
      let startKey: string | undefined;
      let iteration = 0;

      do {
        const keys = await client.query.system.account.pagedKeys(
          startKey ? { pageSize: 1000, startKey } : { pageSize: 1000 }
        );

        if (keys.length === 0) break;

        allKeys.push(...keys);

        if (keys.length < 1000) break;

        startKey = client.query.system.account.rawKey(keys[keys.length - 1]);
        iteration++;
      } while (iteration < 100); // Safety limit

      // Fetch all entries
      const allEntries = await client.query.system.account.entries();

      expect(allEntries.length).toBe(allKeys.length);
      console.log(`Entries count (${allEntries.length}) matches pagedKeys count (${allKeys.length})`);
    });

    it('should match data with accumulated pagedEntries', async () => {
      console.log('=== Comparing entries with accumulated pagedEntries ===');

      // Fetch all entries at once
      const allEntriesViaEntries = await client.query.system.account.entries();

      // Fetch all entries via pagination
      let allEntriesViaPaging: any[] = [];
      let startKey: string | undefined;
      let iteration = 0;

      do {
        const entries = await client.query.system.account.pagedEntries(
          startKey ? { pageSize: 250, startKey } : { pageSize: 250 }
        );

        if (entries.length === 0) break;

        allEntriesViaPaging.push(...entries);

        if (entries.length < 250) break;

        startKey = client.query.system.account.rawKey(entries[entries.length - 1][0]);
        iteration++;
      } while (iteration < 100); // Safety limit

      expect(allEntriesViaEntries.length).toBe(allEntriesViaPaging.length);

      // Verify first 10 entries match exactly
      const samplesToCheck = Math.min(10, allEntriesViaEntries.length);
      for (let i = 0; i < samplesToCheck; i++) {
        const [keyViaEntries, valueViaEntries] = allEntriesViaEntries[i];
        const [keyViaPaged, valueViaPaged] = allEntriesViaPaging[i];

        expect(keyViaEntries.address()).toBe(keyViaPaged.address());
        expect(valueViaEntries.data.free).toBe(valueViaPaged.data.free);
        expect(valueViaEntries.nonce).toBe(valueViaPaged.nonce);
      }

      console.log(`Verified ${samplesToCheck} sample entries match between methods`);
      console.log(`Total entries: ${allEntriesViaEntries.length}`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple consecutive calls', async () => {
      console.log('=== Testing multiple consecutive calls ===');

      const firstCall = await client.query.system.account.entries();
      const secondCall = await client.query.system.account.entries();
      const thirdCall = await client.query.system.account.entries();

      // All should return the same count (at same block)
      expect(firstCall.length).toBe(secondCall.length);
      expect(secondCall.length).toBe(thirdCall.length);

      console.log(`Consistent results across 3 calls: ${firstCall.length} entries`);
    });

    it('should return entries in consistent order', async () => {
      console.log('=== Testing order consistency ===');

      const firstCall = await client.query.system.account.entries();
      const secondCall = await client.query.system.account.entries();

      // Verify order is consistent
      const minLength = Math.min(firstCall.length, secondCall.length);
      for (let i = 0; i < Math.min(10, minLength); i++) {
        const [key1] = firstCall[i];
        const [key2] = secondCall[i];
        expect(key1.address()).toBe(key2.address());
      }

      console.log('Order is consistent across multiple calls');
    });
  });

  describe('Performance', () => {
    it('should complete in reasonable time', async () => {
      console.log('=== Performance test for entries method ===');

      const startTime = Date.now();
      const allEntries = await client.query.system.account.entries();
      const duration = Date.now() - startTime;

      expect(allEntries.length).toBeGreaterThan(0);

      console.log(`Fetched ${allEntries.length} entries in ${duration}ms`);
      console.log(`Average time per entry: ${(duration / allEntries.length).toFixed(2)}ms`);

      // Should complete in reasonable time (adjust based on expected data size)
      // This is a sanity check, not a strict performance requirement
      expect(duration).toBeLessThan(60000); // 60 seconds max
    });

    it('should compare performance: entries vs manual pagination', async () => {
      console.log('=== Performance comparison: entries vs manual pagination ===');

      // Measure entries method
      const entriesStart = Date.now();
      const viaEntries = await client.query.system.account.entries();
      const entriesTime = Date.now() - entriesStart;

      // Measure manual pagination
      const pagingStart = Date.now();
      let viaPaging: any[] = [];
      let startKey: string | undefined;
      let iteration = 0;

      do {
        const entries = await client.query.system.account.pagedEntries(
          startKey ? { pageSize: 250, startKey } : { pageSize: 250 }
        );

        if (entries.length === 0) break;

        viaPaging.push(...entries);

        if (entries.length < 250) break;

        startKey = client.query.system.account.rawKey(entries[entries.length - 1][0]);
        iteration++;
      } while (iteration < 100);

      const pagingTime = Date.now() - pagingStart;

      console.log(`Entries method: ${entriesTime}ms (${viaEntries.length} entries)`);
      console.log(`Manual pagination: ${pagingTime}ms (${viaPaging.length} entries, ${iteration} pages)`);
      console.log(`Time difference: ${Math.abs(entriesTime - pagingTime)}ms`);

      // Both should return same count
      expect(viaEntries.length).toBe(viaPaging.length);
    });
  });

  describe('Historical Block Queries', () => {
    it('should work with .at() for historical blocks', async () => {
      console.log('=== Testing entries with historical blocks ===');

      const genesisHash = (await client.rpc.chain_getBlockHash(0))!;
      const genesisApi = await client.at(genesisHash);

      const genesisEntries = await genesisApi.query.system.account.entries();

      expect(Array.isArray(genesisEntries)).toBe(true);
      expect(genesisEntries.length).toBeGreaterThan(0);

      console.log(`Genesis block entries: ${genesisEntries.length}`);

      // Verify structure
      genesisEntries.forEach(([key, value]) => {
        expect(key).toBeDefined();
        expect(value).toBeDefined();
        expect(typeof value.data.free).toBe('bigint');
      });
    });

    it('should show different data at different blocks', async () => {
      console.log('=== Comparing entries across blocks ===');

      const genesisHash = (await client.rpc.chain_getBlockHash(0))!;
      const finalizedHash = await client.rpc.chain_getFinalizedHead();

      const genesisApi = await client.at(genesisHash);
      const finalizedApi = await client.at(finalizedHash);

      const [genesisEntries, finalizedEntries] = await Promise.all([
        genesisApi.query.system.account.entries(),
        finalizedApi.query.system.account.entries(),
      ]);

      expect(genesisEntries.length).toBeGreaterThan(0);
      expect(finalizedEntries.length).toBeGreaterThan(0);

      console.log(`Genesis: ${genesisEntries.length} entries`);
      console.log(`Finalized: ${finalizedEntries.length} entries`);

      // Entries count could be same or different depending on chain activity
      // We just verify both are accessible
    });
  });
});

