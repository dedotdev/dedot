import { describe, expect, it, vi } from 'vitest';
import { findBlockFromSpecVersion } from '../utils.js';

// Helper function to create a mock DedotClient
const createMockClient = (config: {
  latestBlock: number;
  latestSpecVersion: number;
  genesisSpecVersion: number;
  blockToSpecMap: Record<number, number>; // blockNumber -> specVersion
}) => {
  return {
    runtimeVersion: { specVersion: config.latestSpecVersion },
    rpc: {
      chain_getBlockHash: vi.fn((blockNum: number) => {
        if (blockNum >= 0 && blockNum <= config.latestBlock) {
          return Promise.resolve(`0x${blockNum.toString(16).padStart(64, '0')}` as any);
        }
        return Promise.resolve(undefined);
      }),
      state_getRuntimeVersion: vi.fn((blockHash: string) => {
        const blockNum = parseInt(blockHash.slice(2), 16);
        return Promise.resolve({
          specVersion: config.blockToSpecMap[blockNum] || config.genesisSpecVersion,
        } as any);
      }),
    },
    block: {
      best: vi.fn(() =>
        Promise.resolve({
          number: config.latestBlock,
          hash: `0x${config.latestBlock.toString(16).padStart(64, '0')}`,
        } as any),
      ),
    },
  } as any;
};

describe('findBlockFromSpecVersion', () => {
  describe('Happy path tests', () => {
    it('should find specVersion in the middle of the chain', async () => {
      // Setup: Chain with 100 blocks, specVersion progresses linearly
      const blockToSpecMap: Record<number, number> = {};
      for (let i = 0; i <= 100; i++) {
        blockToSpecMap[i] = 1000 + i; // specVersion 1000 to 1100
      }

      const mockClient = createMockClient({
        latestBlock: 100,
        latestSpecVersion: 1100,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Search for specVersion 1050 (should be at block 50)
      const result = await findBlockFromSpecVersion(mockClient, 1050);

      expect(result.blockHash).toBe(`0x${(50).toString(16).padStart(64, '0')}`);
      expect(result.blockNumber).toBe(50);
    });

    it('should find specVersion at genesis block', async () => {
      const blockToSpecMap: Record<number, number> = {
        0: 1000,  // Only genesis has this specVersion
        50: 1050,
        100: 1100,
      };

      const mockClient = createMockClient({
        latestBlock: 100,
        latestSpecVersion: 1100,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Search for genesis specVersion - binary search will find a block with this specVersion
      const result = await findBlockFromSpecVersion(mockClient, 1000);

      // Binary search finds *a* block with the specVersion, verify it's a valid block hash
      expect(result.blockHash).toMatch(/^0x[0-9a-f]{64}$/);

      // Verify the found block has the correct specVersion
      expect(blockToSpecMap[result.blockNumber] || 1000).toBe(1000);
    });

    it('should find specVersion at latest block', async () => {
      const blockToSpecMap: Record<number, number> = {
        0: 1000,
        50: 1050,
        100: 1100,
      };

      const mockClient = createMockClient({
        latestBlock: 100,
        latestSpecVersion: 1100,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Search for latest specVersion
      const result = await findBlockFromSpecVersion(mockClient, 1100);

      expect(result.blockHash).toBe(`0x${(100).toString(16).padStart(64, '0')}`);
      expect(result.blockNumber).toBe(100);
    });

    it('should handle chain with single block', async () => {
      const blockToSpecMap: Record<number, number> = {
        0: 1000,
      };

      const mockClient = createMockClient({
        latestBlock: 0,
        latestSpecVersion: 1000,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      const result = await findBlockFromSpecVersion(mockClient, 1000);

      expect(result.blockHash).toBe(`0x${(0).toString(16).padStart(64, '0')}`);
      expect(result.blockNumber).toBe(0);
    });

    it('should find correct block when runtime upgrades happen at specific blocks', async () => {
      // Simulate real-world scenario: runtime upgrades don't happen every block
      const blockToSpecMap: Record<number, number> = {
        0: 1000,
        1: 1000,
        2: 1000,
        3: 1001, // Runtime upgrade at block 3
        4: 1001,
        5: 1001,
        6: 1002, // Runtime upgrade at block 6
        7: 1002,
        8: 1002,
        9: 1003, // Runtime upgrade at block 9
        10: 1003,
      };

      const mockClient = createMockClient({
        latestBlock: 10,
        latestSpecVersion: 1003,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Should find a block with specVersion 1001 (binary search finds any match, not necessarily first)
      const result = await findBlockFromSpecVersion(mockClient, 1001);

      // Verify it's a valid block hash
      expect(result.blockHash).toMatch(/^0x[0-9a-f]{64}$/);

      // Verify the found block has the correct specVersion
      expect(blockToSpecMap[result.blockNumber]).toBe(1001);

      // Should be one of blocks 3, 4, or 5
      expect([3, 4, 5]).toContain(result.blockNumber);
    });
  });

  describe('Error cases', () => {
    it('should throw error when specVersion is too low (below genesis)', async () => {
      const blockToSpecMap: Record<number, number> = {
        0: 1000,
        50: 1050,
        100: 1100,
      };

      const mockClient = createMockClient({
        latestBlock: 100,
        latestSpecVersion: 1100,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Try to find specVersion below genesis
      await expect(findBlockFromSpecVersion(mockClient, 500)).rejects.toThrowError(
        /lower than the earliest specVersion/,
      );
    });

    it('should throw error when specVersion is too high (above latest)', async () => {
      const blockToSpecMap: Record<number, number> = {
        0: 1000,
        50: 1050,
        100: 1100,
      };

      const mockClient = createMockClient({
        latestBlock: 100,
        latestSpecVersion: 1100,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Try to find specVersion above latest
      await expect(findBlockFromSpecVersion(mockClient, 2000)).rejects.toThrowError(
        /higher than the latest specVersion/,
      );
    });

    it('should throw error when specVersion is not found in chain', async () => {
      // Simulate case where runtime upgrades skip version numbers
      const blockToSpecMap: Record<number, number> = {
        0: 1000,
        25: 1000,
        50: 1030, // Jumped from 1000 to 1030 (skipped 1001-1029)
        75: 1030,
        100: 1060, // Jumped from 1030 to 1060
      };

      const mockClient = createMockClient({
        latestBlock: 100,
        latestSpecVersion: 1060,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      // Try to find a skipped specVersion
      await expect(findBlockFromSpecVersion(mockClient, 1020)).rejects.toThrowError(
        /Could not find a block with specVersion/,
      );
    });
  });

  describe('Binary search efficiency', () => {
    it('should find specVersion in large chain', async () => {
      // Setup: Large chain with 10000 blocks
      const blockToSpecMap: Record<number, number> = {};
      for (let i = 0; i <= 10000; i++) {
        blockToSpecMap[i] = 1000 + Math.floor(i / 100); // specVersion increases every 100 blocks
      }

      const mockClient = createMockClient({
        latestBlock: 10000,
        latestSpecVersion: 1100,
        genesisSpecVersion: 1000,
        blockToSpecMap,
      });

      const result = await findBlockFromSpecVersion(mockClient, 1050);

      // Should find a valid block
      expect(result.blockHash).toMatch(/^0x[0-9a-f]{64}$/);

      // Verify the found block has the correct specVersion
      expect(blockToSpecMap[result.blockNumber]).toBe(1050);
    });
  });
});
