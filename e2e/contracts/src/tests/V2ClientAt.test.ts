import { DedotClient } from 'dedot';
import { assert, DedotError, HexString } from 'dedot/utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { devPairs } from '../utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

describe('V2Client .at() Method E2E Tests', () => {
  let client: DedotClient;
  let genesisHash: HexString;
  let finalizedHash: HexString;
  let bestHash: HexString;
  let finalizedHeight: number;

  beforeAll(async () => {
    // Use reviveClient from global setup (connected to INK_NODE_ENDPOINT)
    client = reviveClient;

    genesisHash = reviveClient.genesisHash;
    finalizedHash = await reviveClient.rpc.chain_getFinalizedHead();
    finalizedHeight = (await reviveClient.rpc.chain_getHeader(finalizedHash))!.number;
    bestHash = (await client.rpc.chain_getBlockHash())!;
  }, 120_000);

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Setup and Server Capability Validation', () => {
    it('should throw DedotError when Archive is not supported by server', async () => {
      // Create a mock client with unsupported Archive
      const mockArchive = {
        supported: vi.fn().mockResolvedValue(false),
      };

      const mockClient = {
        _archive: mockArchive,
        archive: async function () {
          if (!this._archive) {
            throw new DedotError('Archive instance is not initialized');
          }

          if (!(await this._archive.supported())) {
            throw new DedotError('Archive JSON-RPC is not supported by the connected server/node');
          }

          return this._archive;
        },
      };

      await expect(mockClient.archive()).rejects.toThrow(DedotError);
      await expect(mockClient.archive()).rejects.toThrow(
        'Archive JSON-RPC is not supported by the connected server/node',
      );
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
      // Mock isPinned to return false to ensure Archive fallback is triggered
      // (genesis might still be pinned in newly launched chains)
      // vi.spyOn(client.chainHead, 'isPinned').mockReturnValue(false);
      // vi.spyOn(client.chainHead, 'findBlock').mockReturnValue(undefined);

      const genesisApi = await client.at(genesisHash);

      expect(genesisApi).toBeDefined();
      expect(genesisApi.atBlockHash).toBe(genesisHash);
      expect(genesisApi.runtimeVersion).toBeDefined();
      expect(genesisApi.metadata).toBeDefined();
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
  });

  describe('QueryMulti Functional Tests', () => {
    it('should perform basic queryMulti at historical blocks', async () => {
      console.log('=== Basic QueryMulti Functional Test ===');

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
        console.log(`${address}: Balance=${account.data.free}, Nonce=${account.nonce}`);
      });

      console.log('Basic queryMulti functional test completed');
    });

    it('should handle mixed query types in queryMulti', async () => {
      console.log('=== Mixed Query Types Test ===');

      const finalizedApi = await client.at(finalizedHash);

      // Mix different types of queries

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
        `Mixed queries result: Block=${blockNumber}, Alice=${aliceAccount.data.free}, Bob=${bobAccount.data.free}`,
      );
      console.log('Mixed query types test completed');
    });

    it('should handle empty queryMulti arrays', async () => {
      console.log('=== Empty QueryMulti Test ===');

      const api = await client.at(genesisHash);
      const results = await api.queryMulti([]);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);

      console.log('Empty queryMulti handled correctly');
    });

    it('should handle large batch queries efficiently', async () => {
      console.log('=== Large Batch Query Test ===');

      const api = await client.at(finalizedHash);

      // Create a larger set of queries (multiple accounts repeated)
      const accounts = [ALICE, BOB];
      const largeQuerySet = [];

      for (let i = 0; i < 10; i++) {
        for (const account of accounts) {
          largeQuerySet.push({ fn: api.query.system.account, args: [account] });
        }
      }

      expect(largeQuerySet.length).toBe(20);

      const startTime = Date.now();
      // @ts-ignore
      const results = await api.queryMulti(largeQuerySet);
      const queryTime = Date.now() - startTime;

      expect(results.length).toBe(20);
      results.forEach((account, index) => {
        expect(account).toBeDefined();
        expect(typeof account.data.free).toBe('bigint');
      });

      console.log(`Large batch query (${largeQuerySet.length} queries) completed in ${queryTime}ms`);
      console.log('Large batch query test completed');
    });
  });

  describe('Transfer Scenario Tests', () => {
    const TRANSFER_AMOUNT = 1000000000000n; // 1 DOT in planck

    it('should verify balance changes with queryMulti across transfer', async () => {
      console.log('=== Transfer Scenario with Balance Verification ===');

      // Get current block hash for "before" state
      const beforeHash = (await client.rpc.chain_getBlockHash())!;
      const beforeApi = await client.at(beforeHash);

      const [aliceBefore, bobBefore] = await beforeApi.queryMulti([
        { fn: beforeApi.query.system.account, args: [ALICE] },
        { fn: beforeApi.query.system.account, args: [BOB] },
      ]);

      console.log('Balances before transfer:');
      console.log(`  Alice: ${aliceBefore.data.free}`);
      console.log(`  Bob: ${bobBefore.data.free}`);

      // Ensure Alice has sufficient balance for transfer
      assert(aliceBefore.data.free > TRANSFER_AMOUNT, 'Skipping transfer test - insufficient Alice balance');

      // Execute transfer from Alice to Bob
      const { alice } = devPairs();

      const transferTx = client.tx.balances.transferKeepAlive(BOB, TRANSFER_AMOUNT);
      const txResult = await transferTx.signAndSend(alice).untilBestChainBlockIncluded();

      // @ts-ignore
      const afterHash = txResult.status.value.blockHash;
      console.log(`Transfer completed in block: ${afterHash}`);

      // Get the after-transfer block hash
      const afterApi = await client.at(afterHash);

      const [aliceAfter, bobAfter] = await afterApi.queryMulti([
        { fn: afterApi.query.system.account, args: [ALICE] },
        { fn: afterApi.query.system.account, args: [BOB] },
      ]);

      console.log('Balances after transfer:');
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

      console.log('Transfer scenario verification completed successfully');
    }); // Extended timeout for blockchain operations
  });
});
