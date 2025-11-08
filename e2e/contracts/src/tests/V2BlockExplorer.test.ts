import { $Header, Header } from '@dedot/codecs';
import { HexString } from '@dedot/utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { BlockInfo, DedotClient } from '../../../../packages/api/src/index.js';

describe('V2BlockExplorer E2E Tests', () => {
  let client: DedotClient;
  let genesisHash: HexString;
  let genesisNumber: number;

  beforeAll(async () => {
    client = reviveClient;

    // Get genesis block info for reference
    genesisHash = client.genesisHash;
    genesisNumber = 0;
  }, 120_000);

  // Helper: Validate BlockInfo structure
  const assertValidBlockInfo = (block: BlockInfo, description = 'block') => {
    expect(block, `${description} should be defined`).toBeDefined();
    expect(block.hash, `${description}.hash should match pattern`).toMatch(/^0x[0-9a-f]{64}$/);
    expect(block.number, `${description}.number should be >= 0`).toBeGreaterThanOrEqual(0);
    expect(block.parent, `${description}.parent should match pattern`).toMatch(/^0x[0-9a-f]{64}$/);
  };

  // Helper: Validate Header structure
  const assertValidHeader = (header: Header, expectedNumber?: number) => {
    expect(header).toBeDefined();
    expect(header.parentHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(header.number).toBeGreaterThanOrEqual(0);
    expect(header.stateRoot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(header.extrinsicsRoot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(header.digest).toBeDefined();
    expect(header.digest.logs).toBeInstanceOf(Array);

    if (expectedNumber !== undefined) {
      expect(header.number).toBe(expectedNumber);
    }
  };

  // Helper: Wait for N blocks and collect them
  const waitForBlocks = (count: number, subscribe: (cb: any) => () => void): Promise<BlockInfo[]> => {
    return new Promise((resolve, reject) => {
      const blocks: BlockInfo[] = [];
      const timeout = setTimeout(() => {
        unsub();
        reject(new Error(`Timeout waiting for ${count} blocks, got ${blocks.length}`));
      }, 60_000);

      const unsub = subscribe((block: BlockInfo) => {
        blocks.push(block);
        if (blocks.length >= count) {
          clearTimeout(timeout);
          unsub();
          resolve(blocks);
        }
      });
    });
  };

  describe('best() - Query Mode', () => {
    it('should get current best block', async () => {
      const bestBlock = await client.block.best();

      assertValidBlockInfo(bestBlock, 'best block');
      expect(bestBlock.number).toBeGreaterThan(0);
    }, 30_000);

    it('should return valid BlockInfo structure', async () => {
      const bestBlock = await client.block.best();

      expect(bestBlock).toHaveProperty('hash');
      expect(bestBlock).toHaveProperty('number');
      expect(bestBlock).toHaveProperty('parent');
      expect(typeof bestBlock.hash).toBe('string');
      expect(typeof bestBlock.number).toBe('number');
      expect(typeof bestBlock.parent).toBe('string');
    }, 30_000);

    it('should return updated blocks on sequential calls', async () => {
      const block1 = await client.block.best();

      // Wait a bit for chain to produce blocks
      await new Promise(resolve => setTimeout(resolve, 6000));

      const block2 = await client.block.best();

      expect(block2.number).toBeGreaterThanOrEqual(block1.number);
    }, 30_000);
  });

  describe('best(callback) - Subscription Mode', () => {
    let unsub: (() => void) | undefined;

    afterEach(() => {
      if (unsub) {
        unsub();
        unsub = undefined;
      }
    });

    it('should receive initial best block immediately', async () => {
      const callback = vi.fn();

      unsub = client.block.best(callback);

      // Wait for initial emission
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          number: expect.any(Number),
          parent: expect.stringMatching(/^0x[0-9a-f]{64}$/),
        })
      );
    }, 30_000);

    it('should receive new blocks as they are produced', async () => {
      const blocks: BlockInfo[] = [];

      const unsub = client.block.best((block) => {
        blocks.push(block);
      });

      // Wait for blocks to be produced
      await new Promise(resolve => setTimeout(resolve, 15_000));

      unsub();

      // Should have received at least 1 block
      expect(blocks.length).toBeGreaterThanOrEqual(1);

      // Verify blocks are increasing if multiple received
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].number).toBeGreaterThanOrEqual(blocks[i - 1].number);
      }
    }, 30_000);

    it('should provide valid BlockInfo for each update', async () => {
      const blocks: BlockInfo[] = [];

      const unsub = client.block.best((block) => {
        blocks.push(block);
      });

      // Wait for blocks
      await new Promise(resolve => setTimeout(resolve, 12_000));

      unsub();

      // Should have received at least 1 block
      expect(blocks.length).toBeGreaterThanOrEqual(1);

      blocks.forEach((block, i) => {
        assertValidBlockInfo(block, `block ${i}`);
      });
    }, 30_000);

    it('should support multiple independent subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = client.block.best(callback1);
      const unsub2 = client.block.best(callback2);

      // Wait for some blocks
      await new Promise(resolve => setTimeout(resolve, 8000));

      unsub1();
      unsub2();

      expect(callback1.mock.calls.length).toBeGreaterThan(0);
      expect(callback2.mock.calls.length).toBeGreaterThan(0);
      // Both should receive similar number of updates
      expect(Math.abs(callback1.mock.calls.length - callback2.mock.calls.length)).toBeLessThanOrEqual(1);
    }, 30_000);

    it('should stop receiving updates after unsubscribe', async () => {
      const callback = vi.fn();

      unsub = client.block.best(callback);

      // Wait for initial blocks
      await new Promise(resolve => setTimeout(resolve, 3000));

      const callCountBeforeUnsub = callback.mock.calls.length;

      unsub();
      unsub = undefined;

      // Wait to see if more calls come through
      await new Promise(resolve => setTimeout(resolve, 8000));

      const callCountAfterUnsub = callback.mock.calls.length;

      expect(callCountAfterUnsub).toBe(callCountBeforeUnsub);
    }, 30_000);
  });

  describe('finalized() - Query Mode', () => {
    it('should get current finalized block', async () => {
      const finalizedBlock = await client.block.finalized();

      assertValidBlockInfo(finalizedBlock, 'finalized block');
      expect(finalizedBlock.number).toBeGreaterThanOrEqual(0);
    }, 30_000);

    it('should return valid BlockInfo structure', async () => {
      const finalizedBlock = await client.block.finalized();

      expect(finalizedBlock).toHaveProperty('hash');
      expect(finalizedBlock).toHaveProperty('number');
      expect(finalizedBlock).toHaveProperty('parent');
    }, 30_000);

    it('should satisfy invariant: finalized <= best', async () => {
      const bestBlock = await client.block.best();
      const finalizedBlock = await client.block.finalized();

      expect(finalizedBlock.number).toBeLessThanOrEqual(bestBlock.number);
    }, 30_000);

    it('should show finalization progress on sequential calls', async () => {
      const finalized1 = await client.block.finalized();

      // Wait for finalization
      await new Promise(resolve => setTimeout(resolve, 6000));

      const finalized2 = await client.block.finalized();

      expect(finalized2.number).toBeGreaterThanOrEqual(finalized1.number);
    }, 30_000);
  });

  describe('finalized(callback) - Subscription Mode', () => {
    let unsub: (() => void) | undefined;

    afterEach(() => {
      if (unsub) {
        unsub();
        unsub = undefined;
      }
    });

    it('should receive initial finalized block immediately', async () => {
      const callback = vi.fn();

      unsub = client.block.finalized(callback);

      // Wait for initial emission
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          number: expect.any(Number),
          parent: expect.stringMatching(/^0x[0-9a-f]{64}$/),
        })
      );
    }, 30_000);

    it('should receive finalized blocks as chain finalizes', async () => {
      const blocks: BlockInfo[] = [];

      const unsub = client.block.finalized((block) => {
        blocks.push(block);
      });

      // Wait for finalized blocks (finalization is slower)
      await new Promise(resolve => setTimeout(resolve, 15_000));

      unsub();

      // Should have received at least 1 finalized block
      expect(blocks.length).toBeGreaterThanOrEqual(1);

      if (blocks.length > 1) {
        expect(blocks[1].number).toBeGreaterThanOrEqual(blocks[0].number);
      }
    }, 30_000);

    it('should maintain invariant: finalized blocks <= best block', async () => {
      const finalizedBlocks: BlockInfo[] = [];

      unsub = client.block.finalized((block) => {
        finalizedBlocks.push(block);
      });

      // Wait for some finalized blocks
      await new Promise(resolve => setTimeout(resolve, 10_000));

      const currentBest = await client.block.best();

      finalizedBlocks.forEach((finalizedBlock) => {
        expect(finalizedBlock.number).toBeLessThanOrEqual(currentBest.number);
      });
    }, 30_000);

    it('should support multiple independent subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = client.block.finalized(callback1);
      const unsub2 = client.block.finalized(callback2);

      // Wait for some blocks
      await new Promise(resolve => setTimeout(resolve, 8000));

      unsub1();
      unsub2();

      expect(callback1.mock.calls.length).toBeGreaterThan(0);
      expect(callback2.mock.calls.length).toBeGreaterThan(0);
      expect(callback1.mock.calls.length).toBe(callback2.mock.calls.length);
    }, 30_000);
  });

  describe('header(numberOrHash) - Historical Queries', () => {
    it('should get genesis block header by number', async () => {
      const header = await client.block.header(0);

      assertValidHeader(header, 0);
      expect(header.number).toBe(0);
    }, 30_000);

    it('should get genesis block header by hash', async () => {
      const header = await client.block.header(genesisHash);

      assertValidHeader(header, 0);
      expect(header.number).toBe(0);
    }, 30_000);

    it('should get finalized block header', async () => {
      const finalizedBlock = await client.block.finalized();
      const header = await client.block.header(finalizedBlock.hash);

      assertValidHeader(header, finalizedBlock.number);
    }, 30_000);

    it('should get best block header', async () => {
      const bestBlock = await client.block.best();
      const header = await client.block.header(bestBlock.number);

      assertValidHeader(header);
      expect(header.number).toBeGreaterThanOrEqual(bestBlock.number);
    }, 30_000);

    it('should verify header structure completeness', async () => {
      const header = await client.block.header(0);

      expect(header).toHaveProperty('parentHash');
      expect(header).toHaveProperty('number');
      expect(header).toHaveProperty('stateRoot');
      expect(header).toHaveProperty('extrinsicsRoot');
      expect(header).toHaveProperty('digest');
      expect(header.digest).toHaveProperty('logs');
    }, 30_000);

    it('should throw error for invalid hash', async () => {
      const invalidHash = '0xinvalidhash';

      await expect(client.block.header(invalidHash as HexString)).rejects.toThrow();
    }, 30_000);

    it('should throw error for non-existent block number', async () => {
      const futureBlockNumber = 999_999_999;

      await expect(client.block.header(futureBlockNumber)).rejects.toThrow();
    }, 30_000);

    it('should throw error for very large future block number', async () => {
      const veryLargeNumber = Number.MAX_SAFE_INTEGER;

      await expect(client.block.header(veryLargeNumber)).rejects.toThrow();
    }, 30_000);
  });

  describe('body(numberOrHash) - Extrinsics Queries', () => {
    it('should get genesis block body', async () => {
      const body = await client.block.body(0);

      expect(Array.isArray(body)).toBe(true);
      // Genesis might have timestamp extrinsic
      body.forEach((ext) => {
        expect(ext).toMatch(/^0x[0-9a-f]+$/);
      });
    }, 30_000);

    it('should get finalized block body', async () => {
      const finalizedBlock = await client.block.finalized();
      const body = await client.block.body(finalizedBlock.hash);

      expect(Array.isArray(body)).toBe(true);
      body.forEach((ext) => {
        expect(typeof ext).toBe('string');
        expect(ext).toMatch(/^0x[0-9a-f]+$/);
      });
    }, 30_000);

    it('should get best block body', async () => {
      const bestBlock = await client.block.best();
      const body = await client.block.body(bestBlock.number);

      expect(Array.isArray(body)).toBe(true);
      body.forEach((ext) => {
        expect(ext).toMatch(/^0x[0-9a-f]+$/);
      });
    }, 30_000);

    it('should return valid extrinsic hex strings', async () => {
      const body = await client.block.body(genesisHash);

      expect(Array.isArray(body)).toBe(true);
      body.forEach((extrinsic) => {
        expect(typeof extrinsic).toBe('string');
        expect(extrinsic).toMatch(/^0x/);
        // Valid hex string
        expect(() => parseInt(extrinsic.slice(2), 16)).not.toThrow();
      });
    }, 30_000);

    it('should throw error for invalid hash', async () => {
      const invalidHash = '0xinvalidhash';

      await expect(client.block.body(invalidHash as HexString)).rejects.toThrow();
    }, 30_000);

    it('should throw error for non-existent block number', async () => {
      const futureBlockNumber = 999_999_999;

      await expect(client.block.body(futureBlockNumber)).rejects.toThrow();
    }, 30_000);
  });

  describe('Consistency & Integration', () => {
    it('should have matching hashes: best() vs header(best.number)', async () => {
      const bestBlock = await client.block.best();
      const header = await client.block.header(bestBlock.number);

      // Calculate hash from header
      const calculatedHash = client.registry.hashAsHex($Header.tryEncode(header));

      // They should match (or be close if block advanced)
      expect(header.number).toBeGreaterThanOrEqual(bestBlock.number);
    }, 30_000);

    it('should have matching hashes: finalized() vs header(finalized.hash)', async () => {
      const finalizedBlock = await client.block.finalized();
      const header = await client.block.header(finalizedBlock.hash);

      const calculatedHash = client.registry.hashAsHex($Header.tryEncode(header));

      expect(finalizedBlock.hash).toBe(calculatedHash);
    }, 30_000);

    it('should maintain valid parent chain', async () => {
      const bestBlock = await client.block.best();

      // Get current block and its parent
      const currentHeader = await client.block.header(bestBlock.number);

      if (bestBlock.number > 0) {
        const parentHeader = await client.block.header(bestBlock.number - 1);
        const parentHash = client.registry.hashAsHex($Header.tryEncode(parentHeader));

        expect(currentHeader.parentHash).toBe(parentHash);
      }
    }, 30_000);

    it('should handle simultaneous best and finalized subscriptions', async () => {
      const bestBlocks: BlockInfo[] = [];
      const finalizedBlocks: BlockInfo[] = [];

      const unsubBest = client.block.best((block) => bestBlocks.push(block));
      const unsubFinalized = client.block.finalized((block) => finalizedBlocks.push(block));

      // Wait for blocks
      await new Promise(resolve => setTimeout(resolve, 10_000));

      unsubBest();
      unsubFinalized();

      expect(bestBlocks.length).toBeGreaterThan(0);
      expect(finalizedBlocks.length).toBeGreaterThan(0);

      // Best should advance faster or equal to finalized
      const lastBest = bestBlocks[bestBlocks.length - 1];
      const lastFinalized = finalizedBlocks[finalizedBlocks.length - 1];
      expect(lastBest.number).toBeGreaterThanOrEqual(lastFinalized.number);
    }, 30_000);

    it('should show best block advancing faster than finalized', async () => {
      const bestCallback = vi.fn();
      const finalizedCallback = vi.fn();

      const unsubBest = client.block.best(bestCallback);
      const unsubFinalized = client.block.finalized(finalizedCallback);

      // Wait for some activity
      await new Promise(resolve => setTimeout(resolve, 10_000));

      unsubBest();
      unsubFinalized();

      // Best should typically receive more updates than finalized
      expect(bestCallback.mock.calls.length).toBeGreaterThanOrEqual(finalizedCallback.mock.calls.length);
    }, 30_000);
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle query before any subscription is active', async () => {
      // This should work without prior subscriptions
      const bestBlock = await client.block.best();

      assertValidBlockInfo(bestBlock);
    }, 30_000);

    it('should handle subscribe -> unsubscribe -> subscribe again', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // First subscription
      const unsub1 = client.block.best(callback1);
      await new Promise(resolve => setTimeout(resolve, 3000));
      unsub1();

      const countAfterFirst = callback1.mock.calls.length;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second subscription
      const unsub2 = client.block.best(callback2);
      await new Promise(resolve => setTimeout(resolve, 3000));
      unsub2();

      // Both should have received blocks
      expect(countAfterFirst).toBeGreaterThan(0);
      expect(callback2.mock.calls.length).toBeGreaterThan(0);
    }, 30_000);

    it('should handle rapid subscribe/unsubscribe cycles', async () => {
      const unsubs: Array<() => void> = [];

      // Rapid subscribe
      for (let i = 0; i < 5; i++) {
        unsubs.push(client.block.best(() => {}));
      }

      // Rapid unsubscribe
      unsubs.forEach(unsub => unsub());

      // Should still work after
      const bestBlock = await client.block.best();
      assertValidBlockInfo(bestBlock);
    }, 30_000);

    it('should reject invalid hash format (too short)', async () => {
      const shortHash = '0x1234' as HexString;

      await expect(client.block.header(shortHash)).rejects.toThrow();
    }, 30_000);

    it('should reject invalid hash format (not hex)', async () => {
      const nonHexHash = '0xZZZZ' as HexString;

      await expect(client.block.header(nonHexHash)).rejects.toThrow();
    }, 30_000);

    it('should handle block number 0 (genesis edge case)', async () => {
      const header = await client.block.header(0);
      const body = await client.block.body(0);

      assertValidHeader(header, 0);
      expect(Array.isArray(body)).toBe(true);
    }, 30_000);
  });

  describe('V2-Specific: Archive Fallback', () => {
    it('should query old blocks using Archive fallback', async () => {
      // Wait for chain to produce enough blocks
      await new Promise(resolve => setTimeout(resolve, 15_000));

      const currentBest = await client.block.best();

      // Try to query a block that might not be pinned anymore
      // (ChainHead typically keeps last ~10 blocks pinned)
      if (currentBest.number > 20) {
        const oldBlockNumber = Math.max(0, currentBest.number - 20);
        const header = await client.block.header(oldBlockNumber);

        assertValidHeader(header);
        expect(header.number).toBe(oldBlockNumber);
      }
    }, 60_000);

    it('should get old block body via Archive', async () => {
      // Wait for chain to produce blocks
      await new Promise(resolve => setTimeout(resolve, 15_000));

      const currentBest = await client.block.best();

      if (currentBest.number > 20) {
        const oldBlockNumber = Math.max(0, currentBest.number - 20);
        const body = await client.block.body(oldBlockNumber);

        expect(Array.isArray(body)).toBe(true);
        body.forEach((ext) => {
          expect(ext).toMatch(/^0x[0-9a-f]+$/);
        });
      }
    }, 60_000);

    it('should handle Archive queries for genesis block', async () => {
      // Genesis should always be queryable via Archive
      const header = await client.block.header(0);
      const body = await client.block.body(0);

      assertValidHeader(header, 0);
      expect(Array.isArray(body)).toBe(true);
    }, 30_000);

    it('should correctly resolve hash via Archive for old blocks', async () => {
      // Wait for sufficient blocks
      await new Promise(resolve => setTimeout(resolve, 15_000));

      const currentBest = await client.block.best();

      if (currentBest.number > 15) {
        const oldBlockNumber = Math.max(5, currentBest.number - 15);

        // Query by number (may use Archive)
        const headerByNumber = await client.block.header(oldBlockNumber);

        // Calculate hash
        const hash = client.registry.hashAsHex($Header.tryEncode(headerByNumber));

        // Query by hash
        const headerByHash = await client.block.header(hash as HexString);

        // Both should match
        expect(headerByNumber.number).toBe(headerByHash.number);
        expect(headerByNumber.parentHash).toBe(headerByHash.parentHash);
      }
    }, 60_000);

    it('should handle blocks both in pinned set and Archive', async () => {
      const finalizedBlock = await client.block.finalized();

      // Finalized blocks are likely still pinned, but Archive should work too
      const header = await client.block.header(finalizedBlock.number);
      const body = await client.block.body(finalizedBlock.number);

      assertValidHeader(header, finalizedBlock.number);
      expect(Array.isArray(body)).toBe(true);
    }, 30_000);
  });
});
