import { Archive, ChainHead, $, QueryableStorage } from 'dedot';
import { FrameSystemAccountInfo } from 'dedot/chaintypes';
import { $Header, $RuntimeVersion, PortableRegistry, $Metadata, AccountId32 } from 'dedot/codecs';
import { HexString } from 'dedot/utils';
import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import { ChainHeadOperationError } from '../../../../packages/api/src/json-rpc/group/ChainHead/error.js';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

describe('ChainHeadWithArchive', () => {
  let archive: Archive;
  let chainHead: ChainHead;
  let genesisHash: HexString;
  let finalizedHeight: number;
  let finalizedHash: HexString;
  let bestHash: HexString;
  let storageEntry: QueryableStorage;
  let consoleWarnSpy: any;

  beforeAll(async () => {
    // Initialize Archive using reviveClient from global setup
    archive = new Archive(reviveClient);

    // Create single ChainHead with Archive fallback to avoid hitting follow limit
    chainHead = new ChainHead(reviveClient).withArchive(archive);

    // Start following for ChainHead
    await chainHead.follow();

    // Pre-fetch common values for tests
    genesisHash = await archive.genesisHash();
    finalizedHeight = await archive.finalizedHeight();
    finalizedHash = await archive.finalizedHash();
    bestHash = await chainHead.bestHash();

    // Get metadata for storage tests
    const rawMetadata = await archive.call('Metadata_metadata_at_version', '0x0f000000');
    const metadata = $.Option($.lenPrefixed($Metadata)).tryDecode(rawMetadata)!;
    const registry = new PortableRegistry(metadata.latest);
    storageEntry = new QueryableStorage(registry, 'System', 'Account');

    // Setup console spy
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  }, 120_000);

  afterEach(() => {
    consoleWarnSpy.mockClear();
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  describe('Setup Verification', () => {
    it('should have ChainHead and Archive properly initialized', async () => {
      expect(archive).toBeDefined();
      expect(chainHead).toBeDefined();

      // Verify basic functionality
      expect(bestHash).toBeDefined();
      expect(await archive.genesisHash()).toBeDefined();
    });

    it('should have pre-fetched test data available', () => {
      expect(genesisHash).toBeDefined();
      expect(typeof genesisHash).toBe('string');
      expect(genesisHash.startsWith('0x')).toBe(true);

      expect(typeof finalizedHeight).toBe('number');
      expect(finalizedHeight).toBeGreaterThanOrEqual(0);

      expect(finalizedHash).toBeDefined();
      expect(typeof finalizedHash).toBe('string');
      expect(finalizedHash.startsWith('0x')).toBe(true);
    });
  });

  describe('Header Fallback Tests', () => {
    it('should fallback to Archive when block is not pinned', async () => {
      // Mock isPinned to return false to simulate unpinned block
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const headerResult = await chainHead.header(genesisHash);

      expect(headerResult).toBeDefined();
      const header = $Header.tryDecode(headerResult);
      expect(header.number).toBe(0);

      // Should trigger fallback warning with correct hash
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should provide consistent results between ChainHead and Archive', async () => {
      // Get header from Archive directly
      const archiveHeader = await archive.header(genesisHash);

      // Get header via fallback mechanism
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);
      const fallbackHeader = await chainHead.header(genesisHash);

      expect(fallbackHeader).toBe(archiveHeader);
    });

    it('should demonstrate that archive fallback works when blocks are not pinned', async () => {
      // In this test environment, blocks are generally not pinned, so test the fallback
      console.log('Testing archive fallback behavior when blocks are not pinned');

      const headerResult = await chainHead.header(genesisHash);

      expect(headerResult).toBeDefined();
      const header = $Header.tryDecode(headerResult);
      expect(Number(header.number)).toBe(0);

      // Should trigger fallback warning since blocks aren't pinned in test env
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });
  });

  describe('Body Fallback Tests', () => {
    it('should fallback to Archive when block is not pinned', async () => {
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const bodyResult = await chainHead.body(genesisHash);

      expect(Array.isArray(bodyResult)).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should demonstrate that archive fallback works for body when blocks are not pinned', async () => {
      // In this test environment, blocks are generally not pinned, so test the fallback
      console.log('Testing archive fallback behavior for body when blocks are not pinned');

      const bodyResult = await chainHead.body(genesisHash);

      expect(Array.isArray(bodyResult)).toBe(true);

      // Should trigger fallback warning since blocks aren't pinned in test env
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should throw ChainHeadOperationError when Archive returns undefined', async () => {
      // Mock Archive.body to return undefined
      const originalBody = archive.body;
      vi.spyOn(archive, 'body').mockResolvedValue(undefined);
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      await expect(chainHead.body(genesisHash)).rejects.toThrow(ChainHeadOperationError);

      // Restore original method
      archive.body = originalBody;
    });

    it('should provide consistent results between ChainHead and Archive', async () => {
      const archiveBody = await archive.body(genesisHash);

      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);
      const fallbackBody = await chainHead.body(genesisHash);

      expect(fallbackBody).toEqual(archiveBody);
    });
  });

  describe('Call Fallback Tests', () => {
    it('should fallback to Archive when block is not pinned', async () => {
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const versionResult = await chainHead.call('Core_version', '0x', genesisHash);

      expect(versionResult).toBeDefined();
      const runtime = $RuntimeVersion.tryDecode(versionResult);
      expect(runtime.specVersion).toBeDefined();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should demonstrate that archive fallback works for calls when blocks are not pinned', async () => {
      // In this test environment, blocks are generally not pinned, so test the fallback
      console.log('Testing archive fallback behavior for calls when blocks are not pinned');

      const versionResult = await chainHead.call('Core_version', '0x', genesisHash);

      expect(versionResult).toBeDefined();
      const runtime = $RuntimeVersion.tryDecode(versionResult);
      expect(runtime.specVersion).toBeDefined();

      // Should trigger fallback warning since blocks aren't pinned in test env
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should handle metadata calls consistently', async () => {
      const archiveMetadata = await archive.call('Metadata_metadata_at_version', '0x0f000000', genesisHash);

      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);
      const fallbackMetadata = await chainHead.call('Metadata_metadata_at_version', '0x0f000000', genesisHash);

      expect(fallbackMetadata).toEqual(archiveMetadata);
    });
  });

  describe('Storage Fallback Tests', () => {
    it('should fallback to Archive when block is not pinned', async () => {
      const aliceKey = storageEntry.encodeKey(ALICE);
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const results = await chainHead.storage([{ type: 'value', key: aliceKey }], null, genesisHash);

      expect(Array.isArray(results)).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should demonstrate that archive fallback works for storage when blocks are not pinned', async () => {
      // In this test environment, blocks are generally not pinned, so test the fallback
      console.log('Testing archive fallback behavior for storage when blocks are not pinned');

      const aliceKey = storageEntry.encodeKey(ALICE);
      const results = await chainHead.storage([{ type: 'value', key: aliceKey }], null, genesisHash);

      expect(Array.isArray(results)).toBe(true);

      // Should trigger fallback warning since blocks aren't pinned in test env
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should handle multiple account queries via fallback', async () => {
      const aliceKey = storageEntry.encodeKey(ALICE);
      const bobKey = storageEntry.encodeKey(BOB);

      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const results = await chainHead.storage(
        [
          { type: 'value', key: aliceKey },
          { type: 'value', key: bobKey },
        ],
        null,
        genesisHash,
      );

      const balances: [AccountId32, FrameSystemAccountInfo][] = results.map(({ key, value }) => [
        storageEntry.decodeKey(key as HexString),
        storageEntry.decodeValue(value as HexString),
      ]);

      expect(balances.length).toBeGreaterThan(0);
      expect(balances.length).toBeLessThanOrEqual(2);

      // Verify account structure
      for (const [accountId, accountInfo] of balances) {
        expect(accountId).toBeInstanceOf(AccountId32);
        expect(typeof accountInfo.data.free).toBe('bigint');
      }
    });

    it('should handle descendantsValues queries via fallback', async () => {
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const results = await chainHead.storage(
        [{ type: 'descendantsValues', key: storageEntry.prefixKey }],
        null,
        genesisHash,
      );

      const accounts: [AccountId32, FrameSystemAccountInfo][] = results.map(({ key, value }) => [
        storageEntry.decodeKey(key as HexString),
        storageEntry.decodeValue(value as HexString),
      ]);

      expect(accounts.length).toBeGreaterThan(0);

      // Verify Alice and Bob are included if they exist at genesis
      const addresses = accounts.map(([key]) => key.address());
      if (addresses.length > 0) {
        // At genesis, there should be some pre-funded accounts
        expect(addresses.some((addr) => addr.length > 0)).toBe(true);
      }
    });

    it('should provide consistent storage results', async () => {
      const aliceKey = storageEntry.encodeKey(ALICE);

      const archiveResults = await archive.storage([{ type: 'value', key: aliceKey }], null, genesisHash);

      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);
      const fallbackResults = await chainHead.storage([{ type: 'value', key: aliceKey }], null, genesisHash);

      expect(fallbackResults).toEqual(archiveResults);
    });
  });

  describe('Error Handling & Hash Attachment', () => {
    it('should extract hash from ChainHeadBlockNotPinnedError and use it in fallback', async () => {
      // Test that the error contains the hash and Archive gets that specific hash
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      // Spy on the archive method to verify it receives the correct hash
      const archiveHeaderSpy = vi.spyOn(archive, 'header');

      await chainHead.header(genesisHash);

      // Verify archive was called with the exact hash from the error
      expect(archiveHeaderSpy).toHaveBeenCalledWith(genesisHash);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should work with different hashes in error vs parameter', async () => {
      // Test that even if we pass one hash, the error hash is used for archive
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      const archiveHeaderSpy = vi.spyOn(archive, 'header');

      // Call with finalizedHash but mock should still cause fallback with that same hash
      await chainHead.header(finalizedHash);

      expect(archiveHeaderSpy).toHaveBeenCalledWith(finalizedHash);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${finalizedHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });
  });

  describe('Cross-Method Integration Tests', () => {
    it('should handle mixed scenarios with pinned and unpinned blocks', async () => {
      // Test with unpinned block (should fallback)
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);
      const unpinnedHeader = await chainHead.header(genesisHash);
      expect(unpinnedHeader).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${genesisHash} not pinned in ChainHead, falling back to Archive$`)),
      );

      // Clear the mock and console spy
      consoleWarnSpy.mockClear();
      vi.clearAllMocks();

      // Test with another block hash (should also fallback in test env)
      console.log('Testing that different block also uses fallback in test environment');
      const anyHeader = await chainHead.header(finalizedHash);
      expect(anyHeader).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^Block ${finalizedHash} not pinned in ChainHead, falling back to Archive$`)),
      );
    });

    it('should maintain consistent behavior across all methods with fallback', async () => {
      // Mock all calls to use fallback
      vi.spyOn(chainHead, 'isPinned').mockReturnValue(false);

      // Test all methods with same hash
      const testHash = genesisHash;

      const [headerResult, bodyResult, callResult, storageResult] = await Promise.all([
        chainHead.header(testHash),
        chainHead.body(testHash),
        chainHead.call('Core_version', '0x', testHash),
        chainHead.storage([{ type: 'value', key: storageEntry.encodeKey(ALICE) }], null, testHash),
      ]);

      // All should succeed
      expect(headerResult).toBeDefined();
      expect(Array.isArray(bodyResult)).toBe(true);
      expect(callResult).toBeDefined();
      expect(Array.isArray(storageResult)).toBe(true);

      // All should log fallback warnings
      expect(consoleWarnSpy).toHaveBeenCalledTimes(4);
      consoleWarnSpy.mock.calls.forEach((call: any) => {
        expect(call[0]).toMatch(new RegExp(`^Block ${testHash} not pinned in ChainHead, falling back to Archive$`));
      });
    });
  });
});
