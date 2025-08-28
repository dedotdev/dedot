import { Archive, $, QueryableStorage } from 'dedot';
import { FrameSystemAccountInfo } from 'dedot/chaintypes';
import { $Header, $RuntimeVersion, PortableRegistry, $Metadata, AccountId32 } from 'dedot/codecs';
import { HexString } from 'dedot/utils';
import { describe, it, expect, beforeAll } from 'vitest';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

describe('Archive API', () => {
  let archive: Archive;
  let genesisHash: HexString;
  let finalizedHeight: number;
  let finalizedHash: HexString;
  let storageEntry: QueryableStorage;

  beforeAll(async () => {
    // Use reviveClient from global setup (connected to INK_NODE_ENDPOINT)
    archive = new Archive(reviveClient);

    // Pre-fetch some common values for tests
    genesisHash = await archive.genesisHash();
    finalizedHeight = await archive.finalizedHeight();
    finalizedHash = await archive.finalizedHash();

    // Get metadata for storage tests
    const rawMetadata = await archive.call('Metadata_metadata_at_version', '0x0f000000');
    const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata)!;
    const registry = new PortableRegistry(metadata.latest);
    storageEntry = new QueryableStorage(registry, 'System', 'Account');
  });

  describe('Genesis Hash', () => {
    it('should get and cache genesis hash', async () => {
      const hash1 = await archive.genesisHash();
      const hash2 = await archive.genesisHash();

      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
      expect(hash1.startsWith('0x')).toBe(true);
      expect(hash1).toBe(hash2); // Should be cached
      expect(hash1).toBe(genesisHash); // Should match pre-fetched value
    });
  });

  describe('Finalized Block', () => {
    it('should get finalized height', async () => {
      const height = await archive.finalizedHeight();

      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBe(finalizedHeight);
    });

    it('should get finalized hash', async () => {
      const hash = await archive.finalizedHash();

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('0x')).toBe(true);
      expect(hash).toBe(finalizedHash);
    });
  });

  describe('Hash By Height', () => {
    it('should get hashes by height for finalized block', async () => {
      const hashes = await archive.hashByHeight(finalizedHeight);

      expect(Array.isArray(hashes)).toBe(true);
      expect(hashes.length).toBeGreaterThan(0);
      expect(hashes[0]).toBe(finalizedHash);
    });

    it('should get hashes by height for genesis block', async () => {
      const hashes = await archive.hashByHeight(0);

      expect(Array.isArray(hashes)).toBe(true);
      expect(hashes.length).toBeGreaterThan(0);
      expect(hashes[0]).toBe(genesisHash);
    });
  });

  describe('Header', () => {
    it('should get header for current finalized block', async () => {
      const rawHeader = await archive.header();

      expect(rawHeader).toBeDefined();

      const header = $Header.tryDecode(rawHeader);
      expect(header.number).toBeDefined();
      expect(Number(header.number)).toBe(finalizedHeight);
    });

    it('should get header for genesis block', async () => {
      const rawGenesisHeader = await archive.header(genesisHash);

      expect(rawGenesisHeader).toBeDefined();

      const header = $Header.tryDecode(rawGenesisHeader);
      expect(Number(header.number)).toBe(0);
    });

    it('should get header for specific block hash', async () => {
      const rawHeader = await archive.header(finalizedHash);

      expect(rawHeader).toBeDefined();

      const header = $Header.tryDecode(rawHeader);
      expect(header.number).toBeDefined();
      expect(Number(header.number)).toBe(finalizedHeight);
    });
  });

  describe('Body', () => {
    it('should get body for current finalized block', async () => {
      const txs = await archive.body();

      expect(Array.isArray(txs)).toBe(true);
    });

    it('should get body for genesis block', async () => {
      const genesisTxs = await archive.body(genesisHash);

      expect(Array.isArray(genesisTxs)).toBe(true);
    });

    it('should get body for specific block hash', async () => {
      const txs = await archive.body(finalizedHash);

      expect(Array.isArray(txs)).toBe(true);
    });
  });

  describe('Runtime Call', () => {
    it('should call Core_version on finalized block', async () => {
      const rawRuntime = await archive.call('Core_version', '0x');
      const runtime = $RuntimeVersion.tryDecode(rawRuntime);

      expect(runtime.specVersion).toBeDefined();
      expect(runtime.specName).toBeDefined();
      expect(Number(runtime.specVersion)).toBeGreaterThan(0);
    });

    it('should call Core_version on genesis block', async () => {
      const rawGenesisRuntime = await archive.call('Core_version', '0x', genesisHash);
      const genesisRuntime = $RuntimeVersion.tryDecode(rawGenesisRuntime);

      expect(genesisRuntime.specVersion).toBeDefined();
      expect(genesisRuntime.specName).toBeDefined();
      expect(Number(genesisRuntime.specVersion)).toBeGreaterThan(0);
    });

    it('should call Core_version on specific block', async () => {
      const rawRuntime = await archive.call('Core_version', '0x', finalizedHash);
      const runtime = $RuntimeVersion.tryDecode(rawRuntime);

      expect(runtime.specVersion).toBeDefined();
      expect(runtime.specName).toBeDefined();
      expect(Number(runtime.specVersion)).toBeGreaterThan(0);
    });
  });

  describe('Storage', () => {
    it('should query specific account storage (Alice and Bob)', async () => {
      const aliceBalanceRawKey = storageEntry.encodeKey(ALICE);
      const bobBalanceRawKey = storageEntry.encodeKey(BOB);

      const results = await archive.storage([
        { type: 'value', key: aliceBalanceRawKey },
        { type: 'value', key: bobBalanceRawKey },
      ]);

      const balances: [AccountId32, FrameSystemAccountInfo][] = results.map(({ key, value }) => [
        storageEntry.decodeKey(key as HexString),
        storageEntry.decodeValue(value as HexString),
      ]);

      expect(balances.length).toBeGreaterThan(0);
      expect(balances.length).toBeLessThanOrEqual(2);

      // Check each balance has correct structure
      for (const [accountId, accountInfo] of balances) {
        expect(accountId).toBeInstanceOf(AccountId32);
        expect(typeof accountInfo.data.free).toBe('bigint');

        const address = accountId.address();
        expect([ALICE, BOB]).toContain(address);
      }

      console.log(`Found ${balances.length} account balances`);
      balances.forEach(([accountId, accountInfo], index) => {
        console.log(`Account ${index + 1} (${accountId.address()}): ${accountInfo.data.free}`);
      });
    });

    it('should query descendants values for all accounts', async () => {
      const rawAccounts = await archive.storage([{ type: 'descendantsValues', key: storageEntry.prefixKey }]);

      const accounts: [AccountId32, FrameSystemAccountInfo][] = rawAccounts.map(({ key, value }) => [
        storageEntry.decodeKey(key as HexString),
        storageEntry.decodeValue(value as HexString),
      ]);

      expect(accounts.length).toBeGreaterThan(0);
      console.log(`Total accounts found: ${accounts.length}`);

      // Verify Alice and Bob are included
      const addresses = accounts.map(([key]) => key.address());
      expect(addresses).toContain(ALICE);
      expect(addresses).toContain(BOB);

      // Verify account structure
      for (const [accountId, accountInfo] of accounts.slice(0, 3)) {
        // Check first 3
        expect(accountId).toBeInstanceOf(AccountId32);
        expect(typeof accountInfo.data.free).toBe('bigint');
      }
    });

    it('should query storage on genesis block', async () => {
      const genesisAccounts = await archive.storage(
        [{ type: 'descendantsValues', key: storageEntry.prefixKey }],
        null,
        genesisHash,
      );

      expect(Array.isArray(genesisAccounts)).toBe(true);
      console.log(`Genesis accounts found: ${genesisAccounts.length}`);

      // Genesis may have different number of accounts
      if (genesisAccounts.length > 0) {
        const [accountId, accountInfo] = [
          storageEntry.decodeKey(genesisAccounts[0].key as HexString),
          storageEntry.decodeValue(genesisAccounts[0].value as HexString),
        ];
        expect(accountId).toBeInstanceOf(AccountId32);
        expect(typeof accountInfo.data.free).toBe('bigint');
      }
    });

    it('should query storage with child trie (null)', async () => {
      const aliceBalanceRawKey = storageEntry.encodeKey(ALICE);

      const results = await archive.storage(
        [{ type: 'value', key: aliceBalanceRawKey }],
        null, // Explicit null child trie
        finalizedHash,
      );

      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const [accountId, accountInfo] = [
          storageEntry.decodeKey(results[0].key as HexString),
          storageEntry.decodeValue(results[0].value as HexString),
        ];
        expect(accountId.address()).toBe(ALICE);
        expect(typeof accountInfo.data.free).toBe('bigint');
      }
    });
  });

  describe('Cross-Block Consistency', () => {
    it('should verify cross-block consistency', async () => {
      if (finalizedHeight > 0) {
        const previousHeight = finalizedHeight - 1;
        const previousHashes = await archive.hashByHeight(previousHeight);

        if (previousHashes.length > 0) {
          const previousHash = previousHashes[0];
          const previousHeader = await archive.header(previousHash);

          if (previousHeader) {
            const decodedPreviousHeader = $Header.tryDecode(previousHeader);
            expect(Number(decodedPreviousHeader.number)).toBe(previousHeight);
            console.log(`Cross-block consistency verified: Block ${previousHeight} -> Block ${finalizedHeight}`);
          }
        }
      } else {
        console.log('Skipping cross-block consistency test: finalized height is 0');
      }
    });

    it('should verify header chain consistency', async () => {
      // Get current and genesis headers
      const currentHeader = $Header.tryDecode(await archive.header(finalizedHash));
      const genesisHeader = $Header.tryDecode(await archive.header(genesisHash));

      expect(Number(currentHeader.number)).toBeGreaterThanOrEqual(Number(genesisHeader.number));
      expect(Number(genesisHeader.number)).toBe(0);
      expect(Number(currentHeader.number)).toBe(finalizedHeight);

      console.log(`Header chain: Genesis(${Number(genesisHeader.number)}) -> Current(${Number(currentHeader.number)})`);
    });
  });

  describe('Cache Functionality', () => {
    it('should cache genesis hash across multiple calls', async () => {
      // Clear any existing cache first
      archive.clearCache();

      const hash1 = await archive.genesisHash();
      const hash2 = await archive.genesisHash();
      const hash3 = await archive.genesisHash();

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1).toBe(genesisHash);
    });

    it('should cache body results for same block hash', async () => {
      archive.clearCache();

      const body1 = await archive.body(finalizedHash);
      const body2 = await archive.body(finalizedHash);

      expect(body1).toBe(body2); // Should be same reference (cached)
      expect(Array.isArray(body1)).toBe(true);
    });

    it('should cache header results for same block hash', async () => {
      archive.clearCache();

      const header1 = await archive.header(finalizedHash);
      const header2 = await archive.header(finalizedHash);

      expect(header1).toBe(header2); // Should be same reference (cached)
      expect(header1).toBeDefined();
    });

    it('should clear cache properly', async () => {
      // Populate cache first
      await archive.body(finalizedHash);
      await archive.header(finalizedHash);

      // Clear cache
      archive.clearCache();

      // This should work without issues after cache clear
      const newBody = await archive.body(finalizedHash);
      const newHeader = await archive.header(finalizedHash);

      expect(Array.isArray(newBody)).toBe(true);
      expect(newHeader).toBeDefined();
    });
  });
});
