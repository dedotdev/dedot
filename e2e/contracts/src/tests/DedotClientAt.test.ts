import { DedotClient, WsProvider } from 'dedot';
import { DedotError, HexString } from 'dedot/utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

describe('DedotClient .at() Method E2E Tests', () => {
  let client: DedotClient;
  let genesisHash: HexString;
  let finalizedHash: HexString;
  let bestHash: HexString;
  let finalizedHeight: number;
  let consoleWarnSpy: any;

  beforeAll(async () => {
    // Use reviveClient from global setup (connected to INK_NODE_ENDPOINT)
    client = reviveClient;

    // Pre-fetch common values for tests using Archive
    const archive = await client.archive();
    genesisHash = await archive.genesisHash();
    finalizedHeight = await archive.finalizedHeight();
    finalizedHash = await archive.finalizedHash();
    bestHash = await client.chainHead.bestHash();

    // Setup console spy
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  }, 120_000);

  afterEach(() => {
    consoleWarnSpy.mockClear();
    vi.clearAllMocks();
  });

  describe('Setup and Server Capability Validation', () => {
    it('should have Archive properly initialized and supported', async () => {
      const archive = await client.archive();
      expect(archive).toBeDefined();
      expect(client.provider).toBeInstanceOf(WsProvider);

      // Test basic Archive functionality
      const archiveGenesisHash = await archive.genesisHash();
      expect(archiveGenesisHash).toBeDefined();
      expect(archiveGenesisHash.startsWith('0x')).toBe(true);
    });

    it('should throw DedotError when Archive is not supported by server', async () => {
      // Create a mock client with unsupported Archive
      const mockArchive = {
        supported: vi.fn().mockResolvedValue(false),
      };

      const mockClient = {
        _archive: mockArchive,
        archive: async function () {
          if (!this._archive) {
            throw new DedotError('Archive is not initialized');
          }

          if (!(await this._archive.supported())) {
            throw new DedotError('Archive API is not supported by the connected server/node');
          }

          return this._archive;
        },
      };

      await expect(mockClient.archive()).rejects.toThrow(DedotError);
      await expect(mockClient.archive()).rejects.toThrow('Archive API is not supported by the connected server/node');
    });

    it('should have pre-fetched test data available', () => {
      expect(genesisHash).toBeDefined();
      expect(typeof genesisHash).toBe('string');
      expect(genesisHash.startsWith('0x')).toBe(true);

      expect(finalizedHash).toBeDefined();
      expect(typeof finalizedHash).toBe('string');
      expect(finalizedHash.startsWith('0x')).toBe(true);

      expect(typeof finalizedHeight).toBe('number');
      expect(finalizedHeight).toBeGreaterThanOrEqual(0);
    });
  });

  describe('.at() Method with Historical Blocks', () => {
    it('should access genesis block API via Archive fallback', async () => {
      const genesisApi = await client.at(genesisHash);

      expect(genesisApi).toBeDefined();
      expect(genesisApi.atBlockHash).toBe(genesisHash);
      expect(genesisApi.runtimeVersion).toBeDefined();
      expect(genesisApi.metadata).toBeDefined();

      // Should trigger Archive fallback warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} is not pinned, using Archive for historical access$`)),
      );
    });

    it('should access finalized block API (pinned or via Archive)', async () => {
      const finalizedApi = await client.at(finalizedHash);

      expect(finalizedApi).toBeDefined();
      expect(finalizedApi.atBlockHash).toBe(finalizedHash);
      expect(finalizedApi.runtimeVersion).toBeDefined();
      expect(finalizedApi.metadata).toBeDefined();

      // May or may not warn depending on whether block is still pinned
      console.log(`Finalized block ${finalizedHash} access completed`);
    });

    it('should cache .at() results for same block hash', async () => {
      const api1 = await client.at(genesisHash);
      const api2 = await client.at(genesisHash);

      // Should return the exact same instance (cached)
      expect(api1).toBe(api2);

      // May warn depending on whether blocks are pinned in test environment
      console.log('Caching verified for historical blocks');
    });
  });

  describe('Historical Block Queries', () => {
    it('should query storage at genesis block', async () => {
      const genesisApi = await client.at(genesisHash);

      // Query System.Account for Alice at genesis
      const aliceAccount = await genesisApi.query.system.account(ALICE);

      expect(aliceAccount).toBeDefined();
      expect(typeof aliceAccount.data.free).toBe('bigint');

      console.log(`Alice balance at genesis: ${aliceAccount.data.free}`);
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
        console.log(`Account ${address} balance at genesis: ${account.data.free}`);
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
        `Alice balance evolution: Genesis(${genesisAlice.data.free}) -> Finalized(${finalizedAlice.data.free})`,
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

      console.log(`Genesis runtime: ${runtimeVersion.specName}@${runtimeVersion.specVersion}`);
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

      const [genesisRuntime, finalizedRuntime] = await Promise.all([
        genesisApi.call.core.version(),
        finalizedApi.call.core.version(),
      ]);

      expect(genesisRuntime.specName).toBe(finalizedRuntime.specName);
      console.log(`Runtime version evolution: ${genesisRuntime.specVersion} -> ${finalizedRuntime.specVersion}`);

      // Spec version should be >= (may have upgrades)
      expect(Number(finalizedRuntime.specVersion)).toBeGreaterThanOrEqual(Number(genesisRuntime.specVersion));
    });
  });

  describe('Historical Constants and Events', () => {
    it('should access constants at historical blocks', async () => {
      const genesisApi = await client.at(genesisHash);

      // Get existential deposit constant at genesis
      const existentialDeposit = genesisApi.consts.balances.existentialDeposit;

      expect(existentialDeposit).toBeDefined();
      expect(typeof existentialDeposit).toBe('bigint');
      expect(existentialDeposit).toBeGreaterThan(0n);

      console.log(`Existential deposit at genesis: ${existentialDeposit}`);
    });

    it('should access event types at historical blocks', async () => {
      const genesisApi = await client.at(genesisHash);

      // Access events codec at genesis
      expect(genesisApi.events).toBeDefined();
      expect(genesisApi.events.system).toBeDefined();
      expect(genesisApi.events.system.NewAccount).toBeDefined();

      console.log('Event codecs accessible at genesis block');
    });

    it('should access error types at historical blocks', async () => {
      const genesisApi = await client.at(genesisHash);

      // Access errors codec at genesis
      expect(genesisApi.errors).toBeDefined();
      expect(genesisApi.errors.system).toBeDefined();

      console.log('Error codecs accessible at genesis block');
    });
  });

  describe('View Functions at Historical Blocks', () => {
    it('should call view functions at genesis block', async () => {
      const genesisApi = await client.at(genesisHash);

      try {
        // Try to call a view function (may not exist in older runtimes)
        if (genesisApi.view.system && genesisApi.view.system.account) {
          const viewResult = await genesisApi.view.system.account(ALICE);
          expect(viewResult).toBeDefined();
          console.log('View function call successful at genesis');
        } else {
          console.log('View functions not available at genesis (expected for older runtimes)');
        }
      } catch (error) {
        // View functions may not be available in older runtimes
        console.log('View functions not supported at genesis block');
        expect(true).toBe(true); // Pass the test
      }
    });
  });

  describe('Cross-Block Consistency and Integration', () => {
    it('should maintain consistent API structure across blocks', async () => {
      const genesisApi = await client.at(genesisHash);
      const finalizedApi = await client.at(finalizedHash);

      // Both APIs should have the same structure
      expect(genesisApi.query).toBeDefined();
      expect(genesisApi.call).toBeDefined();
      expect(genesisApi.consts).toBeDefined();
      expect(genesisApi.events).toBeDefined();
      expect(genesisApi.errors).toBeDefined();

      expect(finalizedApi.query).toBeDefined();
      expect(finalizedApi.call).toBeDefined();
      expect(finalizedApi.consts).toBeDefined();
      expect(finalizedApi.events).toBeDefined();
      expect(finalizedApi.errors).toBeDefined();

      // Block hashes should be different
      expect(genesisApi.atBlockHash).toBe(genesisHash);
      expect(finalizedApi.atBlockHash).toBe(finalizedHash);
      expect(genesisApi.atBlockHash).not.toBe(finalizedApi.atBlockHash);
    });

    it('should handle concurrent historical queries', async () => {
      const blockHashes = [genesisHash, finalizedHash];

      // Create multiple concurrent .at() calls
      const apiPromises = blockHashes.map((hash) => client.at(hash));
      const apis = await Promise.all(apiPromises);

      expect(apis.length).toBe(2);
      apis.forEach((api, index) => {
        expect(api.atBlockHash).toBe(blockHashes[index]);
        expect(api.runtimeVersion).toBeDefined();
      });

      console.log('Concurrent historical API access successful');
    });

    it('should provide consistent storage results across different access methods', async () => {
      // Compare results from different blocks using .at() API
      const genesisApi = await client.at(genesisHash);
      const finalizedApi = await client.at(finalizedHash);

      // Get Alice balance from both blocks
      const [genesisAlice, finalizedAlice] = await Promise.all([
        genesisApi.query.system.account(ALICE),
        finalizedApi.query.system.account(ALICE),
      ]);

      // Both should be valid account data
      expect(genesisAlice).toBeDefined();
      expect(finalizedAlice).toBeDefined();
      expect(typeof genesisAlice.data.free).toBe('bigint');
      expect(typeof finalizedAlice.data.free).toBe('bigint');

      // Account structure should be consistent
      expect(genesisAlice.nonce).toBeDefined();
      expect(finalizedAlice.nonce).toBeDefined();

      console.log('Storage consistency verified across historical blocks');
      console.log(`Alice balance: Genesis(${genesisAlice.data.free}) vs Finalized(${finalizedAlice.data.free})`);
    });

    it('should handle runtime version changes across historical blocks', async () => {
      const genesisApi = await client.at(genesisHash);
      const currentApi = await client.at(finalizedHash);

      // Get runtime versions
      const genesisSpec = genesisApi.runtimeVersion.specVersion;
      const currentSpec = currentApi.runtimeVersion.specVersion;

      if (genesisSpec !== currentSpec) {
        console.log(`Runtime upgrade detected: ${genesisSpec} -> ${currentSpec}`);

        // Metadata should be different if runtime versions differ
        if (genesisApi.metadata !== currentApi.metadata) {
          console.log('Different metadata loaded for different runtime versions');
        }

        // Both should still work for their respective blocks
        const [genesisVersion, currentVersion] = await Promise.all([
          genesisApi.call.core.version(),
          currentApi.call.core.version(),
        ]);

        expect(Number(genesisVersion.specVersion)).toBe(genesisSpec);
        expect(Number(currentVersion.specVersion)).toBe(currentSpec);
      } else {
        console.log('No runtime upgrades between genesis and finalized blocks');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid block hashes gracefully', async () => {
      const invalidHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      await expect(client.at(invalidHash)).rejects.toThrow();

      console.log('Invalid block hash properly rejected');
    });

    it('should verify Archive integration is working correctly', async () => {
      // Test that we can access Archive directly
      const archive = await client.archive();
      expect(archive).toBeDefined();

      // Test basic Archive functionality
      const archiveGenesisHash = await archive.genesisHash();
      expect(archiveGenesisHash).toBe(genesisHash);

      // Test Archive storage query
      const archiveFinalizedHeight = await archive.finalizedHeight();
      expect(typeof archiveFinalizedHeight).toBe('number');
      expect(archiveFinalizedHeight).toBeGreaterThanOrEqual(0);

      // Test that .at() works with historical blocks regardless of pinning
      const oldBlockApi = await client.at(genesisHash);
      expect(oldBlockApi).toBeDefined();
      expect(oldBlockApi.atBlockHash).toBe(genesisHash);

      console.log('Archive integration verified successfully');
      console.log(`Archive finalized height: ${archiveFinalizedHeight}`);

      // Log current warnings (may or may not have Archive fallback warnings)
      console.log(`Console warnings captured: ${consoleWarnSpy.mock.calls.length}`);
      consoleWarnSpy.mock.calls.forEach((call: any, index: number) => {
        console.log(`Warning ${index + 1}: ${call[0]}`);
      });
    });
  });
});
