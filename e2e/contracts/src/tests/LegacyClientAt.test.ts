import { DedotClient } from 'dedot';
import { HexString } from 'dedot/utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { devPairs } from '../utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const CHARLIE = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

describe('LegacyClient .at() Method E2E Tests', () => {
  let client: DedotClient;
  let genesisHash: HexString;
  let finalizedHash: HexString;

  beforeAll(async () => {
    // Use contractsClient from global setup (connected to CONTRACTS_NODE_ENDPOINT)
    client = contractsClient;

    // Fetch common block hashes for tests
    genesisHash = (await client.rpc.chain_getBlockHash(0))!;
    finalizedHash = await client.rpc.chain_getFinalizedHead();

    console.log(`LegacyClient testing with genesis: ${genesisHash}`);
    console.log(`LegacyClient testing with finalized: ${finalizedHash}`);
  }, 120_000);

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Client At Functionality', () => {
    it('should create API instance at genesis block', async () => {
      const genesisApi = await client.at(genesisHash);

      expect(genesisApi).toBeDefined();
      expect(genesisApi.atBlockHash).toBe(genesisHash);
      expect(genesisApi.rpcVersion).toBe('legacy');
      expect(genesisApi.runtimeVersion).toBeDefined();
      expect(genesisApi.metadata).toBeDefined();

      console.log('LegacyClient genesis API created successfully');
    });

    it('should create API instance at finalized block', async () => {
      const finalizedApi = await client.at(finalizedHash);

      expect(finalizedApi).toBeDefined();
      expect(finalizedApi.atBlockHash).toBe(finalizedHash);
      expect(finalizedApi.rpcVersion).toBe('legacy');
      expect(finalizedApi.runtimeVersion).toBeDefined();
      expect(finalizedApi.metadata).toBeDefined();

      console.log('LegacyClient finalized API created successfully');
    });

    it('should cache .at() results for same block hash', async () => {
      const api1 = await client.at(genesisHash);
      const api2 = await client.at(genesisHash);

      // Should return the exact same instance (cached)
      expect(api1).toBe(api2);

      console.log('LegacyClient caching verified');
    });
  });

  describe('Historical Block Queries', () => {
    it('should query storage at genesis block', async () => {
      const genesisApi = await client.at(genesisHash);

      // Query System.Account for Alice at genesis
      const aliceAccount = await genesisApi.query.system.account(ALICE);

      expect(aliceAccount).toBeDefined();
      expect(typeof aliceAccount.data.free).toBe('bigint');

      console.log(`LegacyClient Alice balance at genesis: ${aliceAccount.data.free}`);
    });

    it('should query multiple accounts at genesis via storage', async () => {
      const genesisApi = await client.at(genesisHash);

      // Query multiple accounts
      const accounts = await genesisApi.query.system.account.multi([ALICE, BOB]);

      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBe(2);

      accounts.forEach((account, index) => {
        expect(account).toBeDefined();
        expect(typeof account.data.free).toBe('bigint');
        const address = index === 0 ? ALICE : BOB;
        console.log(`LegacyClient Account ${address} balance at genesis: ${account.data.free}`);
      });
    });

    it('should query storage at different historical blocks', async () => {
      // Test with genesis and finalized blocks
      const genesisApi = await client.at(genesisHash);
      const finalizedApi = await client.at(finalizedHash);

      const [genesisAlice, finalizedAlice] = await Promise.all([
        genesisApi.query.system.account(ALICE),
        finalizedApi.query.system.account(ALICE),
      ]);

      expect(genesisAlice).toBeDefined();
      expect(finalizedAlice).toBeDefined();

      console.log(
        `LegacyClient Alice balance evolution: Genesis(${genesisAlice.data.free}) -> Finalized(${finalizedAlice.data.free})`,
      );
    });
  });

  describe('Historical Runtime Calls', () => {
    it('should perform runtime calls at genesis block', async () => {
      const genesisApi = await client.at(genesisHash);

      // Call Core_version at genesis
      const runtimeVersion = await genesisApi.call.core.version();

      expect(runtimeVersion).toBeDefined();
      expect(runtimeVersion.specName).toBeDefined();
      expect(runtimeVersion.specVersion).toBeDefined();
      expect(Number(runtimeVersion.specVersion)).toBeGreaterThan(0);

      console.log(`LegacyClient Genesis runtime: ${runtimeVersion.specName}@${runtimeVersion.specVersion}`);
    });

    it('should call metadata at historical blocks', async () => {
      const genesisApi = await client.at(genesisHash);

      // Get metadata version at genesis
      const metadataVersion = await genesisApi.call.metadata.metadataAtVersion(15);

      expect(metadataVersion).toBeDefined();
    });

    it('should compare runtime versions across blocks', async () => {
      const genesisApi = await client.at(genesisHash);
      const finalizedApi = await client.at(finalizedHash);

      const [genesisVersion, currentVersion] = await Promise.all([
        genesisApi.call.core.version(),
        finalizedApi.call.core.version(),
      ]);

      expect(genesisVersion).toBeDefined();
      expect(currentVersion).toBeDefined();

      const genesisSpec = Number(genesisVersion.specVersion);
      const currentSpec = Number(currentVersion.specVersion);

      expect(genesisSpec).toBeGreaterThan(0);
      expect(currentSpec).toBeGreaterThanOrEqual(genesisSpec);

      if (genesisSpec !== currentSpec) {
        console.log(`LegacyClient Runtime upgrade detected: ${genesisSpec} -> ${currentSpec}`);

        // Both should still work for their respective blocks
        const [genesisVersion2, currentVersion2] = await Promise.all([
          genesisApi.call.core.version(),
          finalizedApi.call.core.version(),
        ]);

        expect(Number(genesisVersion2.specVersion)).toBe(genesisSpec);
        expect(Number(currentVersion2.specVersion)).toBe(currentSpec);
      } else {
        console.log('LegacyClient No runtime upgrades between genesis and finalized blocks');
      }
    });
  });

  describe('Constants and Events at Historical Blocks', () => {
    it('should access constants at genesis block', async () => {
      const genesisApi = await client.at(genesisHash);

      // Get existential deposit constant at genesis
      const existentialDeposit = genesisApi.consts.balances.existentialDeposit;

      expect(existentialDeposit).toBeDefined();
      expect(typeof existentialDeposit).toBe('bigint');
      expect(existentialDeposit).toBeGreaterThan(0n);

      console.log(`LegacyClient Existential deposit at genesis: ${existentialDeposit}`);
    });

    it('should access system events at historical blocks', async () => {
      const finalizedApi = await client.at(finalizedHash);

      // Get events from finalized block
      const events = await finalizedApi.query.system.events();

      expect(Array.isArray(events)).toBe(true);
      console.log(`LegacyClient Events in finalized block: ${events.length}`);
    });
  });

  describe('QueryMulti Functional Tests', () => {
    it('should perform basic queryMulti at historical blocks', async () => {
      console.log('=== LegacyClient Basic QueryMulti Functional Test ===');

      const genesisApi = await client.at(genesisHash);

      const results = await genesisApi.queryMulti([
        { fn: genesisApi.query.system.account, args: [ALICE] },
        { fn: genesisApi.query.system.account, args: [BOB] },
      ]);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);

      results.forEach((account, index) => {
        expect(account).toBeDefined();
        expect(typeof account.data.free).toBe('bigint');
        expect(typeof account.nonce).toBe('number');

        const address = index === 0 ? ALICE : BOB;
        console.log(`LegacyClient ${address}: Balance=${account.data.free}, Nonce=${account.nonce}`);
      });

      console.log('LegacyClient Basic queryMulti functional test completed');
    });

    it('should handle mixed query types in queryMulti', async () => {
      console.log('=== LegacyClient Mixed Query Types Test ===');

      const finalizedApi = await client.at(finalizedHash);

      const [aliceAccount, blockNumber, parentHash, bobAccount] = await finalizedApi.queryMulti([
        { fn: finalizedApi.query.system.account, args: [ALICE] },
        { fn: finalizedApi.query.system.number, args: [] },
        { fn: finalizedApi.query.system.parentHash, args: [] },
        { fn: finalizedApi.query.system.account, args: [BOB] },
      ]);

      // Verify account data
      expect(aliceAccount).toBeDefined();
      expect(typeof aliceAccount.data.free).toBe('bigint');
      expect(bobAccount).toBeDefined();
      expect(typeof bobAccount.data.free).toBe('bigint');

      // Verify metadata
      expect(typeof blockNumber).toBe('number');
      expect(typeof parentHash).toBe('string');
      expect(parentHash.startsWith('0x')).toBe(true);

      console.log(
        `LegacyClient Mixed queries result: Block=${blockNumber}, Alice=${aliceAccount.data.free}, Bob=${bobAccount.data.free}`,
      );
      console.log('LegacyClient Mixed query types test completed');
    });

    it('should handle empty queryMulti arrays', async () => {
      console.log('=== LegacyClient Empty QueryMulti Test ===');

      const api = await client.at(genesisHash);
      const results = await api.queryMulti([]);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);

      console.log('LegacyClient Empty queryMulti handled correctly');
    });

    it('should handle large batch queries efficiently', async () => {
      console.log('=== LegacyClient Large Batch Query Test ===');

      const api = await client.at(finalizedHash);

      // Create a larger set of queries (multiple accounts repeated)
      const accounts = [ALICE, BOB, CHARLIE];
      const largeQuerySet = [];

      for (let i = 0; i < 10; i++) {
        for (const account of accounts) {
          largeQuerySet.push({ fn: api.query.system.account, args: [account] });
        }
      }

      expect(largeQuerySet.length).toBe(30);

      const startTime = Date.now();
      // @ts-ignore
      const results = await api.queryMulti(largeQuerySet);
      const queryTime = Date.now() - startTime;

      expect(results.length).toBe(30);
      results.forEach((account, index) => {
        expect(account).toBeDefined();
        expect(typeof account.data.free).toBe('bigint');
      });

      console.log(`LegacyClient Large batch query (${largeQuerySet.length} queries) completed in ${queryTime}ms`);
      console.log('LegacyClient Large batch query test completed');
    });
  });

  describe('Transfer Scenario Tests', () => {
    const TRANSFER_AMOUNT = 1000000000000n; // 1 DOT in planck

    it('should verify balance changes with queryMulti across transfer', async () => {
      console.log('=== LegacyClient Transfer Scenario with Balance Verification ===');

      // Get current block hash for "before" state
      const beforeHash = (await client.rpc.chain_getBlockHash())!;
      const beforeApi = await client.at(beforeHash);

      const [aliceBefore, bobBefore] = await beforeApi.queryMulti([
        { fn: beforeApi.query.system.account, args: [ALICE] },
        { fn: beforeApi.query.system.account, args: [BOB] },
      ]);

      console.log('LegacyClient Balances before transfer:');
      console.log(`  Alice: ${aliceBefore.data.free}`);
      console.log(`  Bob: ${bobBefore.data.free}`);

      // Ensure Alice has sufficient balance for transfer
      if (aliceBefore.data.free < TRANSFER_AMOUNT) {
        console.log('LegacyClient Skipping transfer test - insufficient Alice balance');
        return;
      }

      // Execute transfer from Alice to Bob
      const { alice } = devPairs();

      const transferTx = client.tx.balances.transferKeepAlive(BOB, TRANSFER_AMOUNT);
      const txResult = await transferTx.signAndSend(alice).untilFinalized();

      // @ts-ignore
      const afterHash = txResult.status.value.blockHash;
      console.log(`LegacyClient Transfer completed in block: ${afterHash}`);

      // Get the after-transfer block hash
      const afterApi = await client.at(afterHash);

      const [aliceAfter, bobAfter] = await afterApi.queryMulti([
        { fn: afterApi.query.system.account, args: [ALICE] },
        { fn: afterApi.query.system.account, args: [BOB] },
      ]);

      console.log('LegacyClient Balances after transfer:');
      console.log(`  Alice: ${aliceAfter.data.free}`);
      console.log(`  Bob: ${bobAfter.data.free}`);

      // Verify balance at previous hash equals pre-transfer balance
      const historicalApi = await client.at(beforeHash);
      const [aliceHistorical, bobHistorical] = await historicalApi.queryMulti([
        { fn: historicalApi.query.system.account, args: [ALICE] },
        { fn: historicalApi.query.system.account, args: [BOB] },
      ]);

      expect(aliceHistorical.data.free).toEqual(aliceBefore.data.free);
      expect(bobHistorical.data.free).toEqual(bobBefore.data.free);

      // Verify transfer actually occurred (accounting for fees)
      expect(aliceAfter.data.free).toBeLessThan(aliceBefore.data.free);
      expect(bobAfter.data.free).toEqual(bobBefore.data.free + TRANSFER_AMOUNT);

      console.log('LegacyClient Transfer scenario verification completed successfully');
    }, 180_000); // Extended timeout for blockchain operations
  });

  describe('Storage Entries Method Tests', () => {
    it('should fetch all System.Account entries', async () => {
      console.log('=== LegacyClient Storage Entries Test ===');

      const finalizedApi = await client.at(finalizedHash);

      // Fetch all entries
      const allEntries = await finalizedApi.query.system.account.entries();

      expect(Array.isArray(allEntries)).toBe(true);
      expect(allEntries.length).toBeGreaterThan(0);

      console.log(`LegacyClient Total System.Account entries: ${allEntries.length}`);

      // Verify structure of entries
      allEntries.forEach(([key, value]) => {
        expect(key).toBeDefined();
        expect(value).toBeDefined();
        expect(typeof value.data.free).toBe('bigint');
        expect(typeof value.nonce).toBe('number');
      });

      console.log('LegacyClient All entries fetched successfully');
    });

    it('should match entries count with pagedKeys count', async () => {
      console.log('=== LegacyClient Entries vs PagedKeys Count Test ===');

      const api = await client.at(finalizedHash);

      // Fetch using pagedKeys to get all keys
      let allKeys: any[] = [];
      let startKey: HexString | undefined;
      let iteration = 0;

      do {
        const keys = await api.query.system.account.pagedKeys(
          startKey ? { pageSize: 1000, startKey } : { pageSize: 1000 },
        );

        if (keys.length === 0) break;

        allKeys.push(...keys);

        if (keys.length < 1000) break;

        startKey = api.query.system.account.rawKey(keys[keys.length - 1]);
        iteration++;
      } while (iteration < 100); // Safety limit

      // Fetch using entries
      const allEntries = await api.query.system.account.entries();

      expect(allEntries.length).toBe(allKeys.length);
      console.log(`LegacyClient Entries count (${allEntries.length}) matches pagedKeys count (${allKeys.length})`);
    });

    it('should return same data as accumulated pagedEntries calls', async () => {
      console.log('=== LegacyClient Entries vs Accumulated PagedEntries Test ===');

      const api = await client.at(finalizedHash);

      // Fetch using entries
      const allEntriesViaEntries = await api.query.system.account.entries();

      // Fetch using pagedEntries (accumulate all pages)
      let allEntriesViaPagedEntries: any[] = [];
      let startKey: HexString | undefined;
      let iteration = 0;

      do {
        const entries = await api.query.system.account.pagedEntries(
          startKey ? { pageSize: 250, startKey } : { pageSize: 250 },
        );

        if (entries.length === 0) break;

        allEntriesViaPagedEntries.push(...entries);

        if (entries.length < 250) break;

        startKey = api.query.system.account.rawKey(entries[entries.length - 1][0]);
        iteration++;
      } while (iteration < 100); // Safety limit

      expect(allEntriesViaEntries.length).toBe(allEntriesViaPagedEntries.length);

      // Verify first few entries match
      for (let i = 0; i < Math.min(5, allEntriesViaEntries.length); i++) {
        const [keyViaEntries, valueViaEntries] = allEntriesViaEntries[i];
        const [keyViaPaged, valueViaPaged] = allEntriesViaPagedEntries[i];

        expect(keyViaEntries.address()).toBe(keyViaPaged.address());
        expect(valueViaEntries.data.free).toBe(valueViaPaged.data.free);
      }

      console.log(
        `LegacyClient Entries method matches accumulated pagedEntries (${allEntriesViaEntries.length} entries)`,
      );
    });

    it('should work correctly at historical blocks', async () => {
      console.log('=== LegacyClient Historical Entries Test ===');

      const genesisApi = await client.at(genesisHash);
      const finalizedApi = await client.at(finalizedHash);

      const genesisEntries = await genesisApi.query.system.account.entries();
      const finalizedEntries = await finalizedApi.query.system.account.entries();

      expect(Array.isArray(genesisEntries)).toBe(true);
      expect(Array.isArray(finalizedEntries)).toBe(true);
      expect(genesisEntries.length).toBeGreaterThan(0);
      expect(finalizedEntries.length).toBeGreaterThan(0);

      console.log(`LegacyClient Genesis entries: ${genesisEntries.length}`);
      console.log(`LegacyClient Finalized entries: ${finalizedEntries.length}`);
      console.log('LegacyClient Historical entries fetched successfully');
    });

    it('should verify entries contain expected accounts', async () => {
      console.log('=== LegacyClient Entries Content Verification Test ===');

      const api = await client.at(finalizedHash);
      const allEntries = await api.query.system.account.entries();

      // Extract all addresses
      const addresses = allEntries.map(([key]) => key.address());

      // Verify known accounts are present
      expect(addresses).toContain(ALICE);
      expect(addresses).toContain(BOB);

      // Find Alice's entry
      const aliceEntry = allEntries.find(([key]) => key.address() === ALICE);
      expect(aliceEntry).toBeDefined();

      if (aliceEntry) {
        const [, aliceAccount] = aliceEntry;
        expect(typeof aliceAccount.data.free).toBe('bigint');
        expect(aliceAccount.data.free).toBeGreaterThan(0n);
        console.log(`LegacyClient Alice balance from entries: ${aliceAccount.data.free}`);
      }

      console.log('LegacyClient Entries content verification passed');
    });

    it('should handle performance comparison: entries vs manual pagination', async () => {
      console.log('=== LegacyClient Performance: Entries vs Manual Pagination ===');

      const api = await client.at(finalizedHash);

      // Time the entries method
      const entriesStartTime = Date.now();
      const allEntriesViaEntries = await api.query.system.account.entries();
      const entriesTime = Date.now() - entriesStartTime;

      // Time manual pagination
      const pagedStartTime = Date.now();
      let allEntriesViaPaging: any[] = [];
      let startKey: HexString | undefined;
      let iteration = 0;

      do {
        const entries = await api.query.system.account.pagedEntries(
          startKey ? { pageSize: 250, startKey } : { pageSize: 250 },
        );

        if (entries.length === 0) break;

        allEntriesViaPaging.push(...entries);

        if (entries.length < 250) break;

        startKey = api.query.system.account.rawKey(entries[entries.length - 1][0]);
        iteration++;
      } while (iteration < 100);

      const pagedTime = Date.now() - pagedStartTime;

      console.log(`LegacyClient Entries method: ${entriesTime}ms (${allEntriesViaEntries.length} entries)`);
      console.log(`LegacyClient Manual pagination: ${pagedTime}ms (${allEntriesViaPaging.length} entries)`);
      console.log(`LegacyClient Time difference: ${Math.abs(entriesTime - pagedTime)}ms`);

      // Both should return the same count
      expect(allEntriesViaEntries.length).toBe(allEntriesViaPaging.length);
    });
  });
});
