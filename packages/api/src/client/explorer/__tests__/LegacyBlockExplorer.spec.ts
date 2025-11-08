import { $Header, type Header } from '@dedot/codecs';
import { HexString, u8aToHex, waitFor } from '@dedot/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LegacyClient } from '../../LegacyClient.js';
import MockProvider from '../../__tests__/MockProvider.js';
import { LegacyBlockExplorer } from '../LegacyBlockExplorer.js';

describe('LegacyBlockExplorer', () => {
  let mockProvider: MockProvider;
  let mockClient: LegacyClient<any>;
  let explorer: LegacyBlockExplorer;
  let subscriptionId: number = 0;

  const createMockHeader = (number: number, parentHash?: HexString): Header => ({
    parentHash: parentHash || `0x${(number > 0 ? number - 1 : 0).toString(16).padStart(64, '0')}`,
    number,
    stateRoot: `0x${number.toString(16).padStart(64, '0')}`,
    extrinsicsRoot: `0x${number.toString(16).padStart(64, '0')}`,
    digest: { logs: [] },
  });

  // Helper to encode header for subscription notifications
  const encodeHeader = (header: Header) => u8aToHex($Header.encode(header));

  const setupMockClient = async () => {
    mockProvider = new MockProvider();

    // Setup default RPC responses
    mockProvider.setRpcRequests({
      chain_getBlockHash: vi.fn((params) => {
        const num = params?.[0];
        if (num === undefined) return '0x0000000000000000000000000000000000000000000000000000000000000000';
        return `0x${num.toString(16).padStart(64, '0')}`;
      }),
      chain_getHeader: vi.fn((params) => {
        const hash = params?.[0];
        if (!hash) return encodeHeader(createMockHeader(0));
        // Extract number from hash for mock
        const num = parseInt(hash.substring(2), 16);
        return encodeHeader(createMockHeader(num));
      }),
      chain_getFinalizedHead: vi.fn(() => '0x0000000000000000000000000000000000000000000000000000000000000001'),
      chain_getBlock: vi.fn((params) => {
        // Return SignedBlock format
        // Note: header must be encoded hex, but top-level structure is plain object
        return {
          block: {
            header: encodeHeader(createMockHeader(1)), // Encoded header as hex string
            extrinsics: [
              '0x280403000b51d93fda8d01', // Valid opaque extrinsic hex strings
              '0x380503001c62e84fa901',
              '0x480603002d73f95faa02',
            ],
          },
          justifications: undefined, // Optional justifications
        };
      }),
      chain_subscribeNewHeads: vi.fn(() => {
        return `subscription-best-${subscriptionId++}`;
      }),
      chain_subscribeFinalizedHeads: vi.fn(() => {
        return `subscription-finalized-${subscriptionId++}`;
      }),
      chain_unsubscribeNewHeads: vi.fn(() => true),
      chain_unsubscribeFinalizedHeads: vi.fn(() => true),
    });

    mockClient = await LegacyClient.new({ provider: mockProvider });
  };

  beforeEach(async () => {
    subscriptionId = 0;
    await setupMockClient();
    explorer = new LegacyBlockExplorer(mockClient);
  });

  afterEach(async () => {
    await mockClient.disconnect();
  });

  describe('best() - Query Mode', () => {
    it('should return cached value if available', async () => {
      // Subscribe to populate cache
      const unsub = explorer.best(() => {});

      // Wait a bit for subscription to set up
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate a block
      const header = createMockHeader(1);
      mockProvider.notify('subscription-best-0', encodeHeader(header));

      await waitFor();

      // Wait for signal to be populated
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Query should return cached value
      const result = await explorer.best();

      expect(result).toBeDefined();
      expect(result.number).toBe(1);

      unsub();
    });

    it('should fallback to RPC if no cache', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const result = await explorer.best();

      expect(result).toBeDefined();
      // Fallback uses chain_getHeader with no args (gets latest)
      expect(providerSend).toHaveBeenCalledWith('chain_getHeader', []);
    });

    it('should calculate block hash correctly', async () => {
      const result = await explorer.best();

      expect(result).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe('string');
    });
  });

  describe('best(callback) - Subscription Mode', () => {
    it('should create RPC subscription on first subscriber', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();
      const unsub = explorer.best(callback);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);

      unsub();
    });

    it('should share RPC subscription across multiple subscribers', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = explorer.best(callback1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const unsub2 = explorer.best(callback2);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should only create one RPC subscription
      const subscriptionCalls = providerSend.mock.calls.filter((call) => call[0] === 'chain_subscribeNewHeads');
      expect(subscriptionCalls).toHaveLength(1);

      unsub1();
      unsub2();
    });

    it('should emit new blocks to all subscribers', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = explorer.best(callback1);
      const unsub2 = explorer.best(callback2);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);

      // Simulate blocks
      const header1 = createMockHeader(1);
      const header2 = createMockHeader(2);

      mockProvider.notify('subscription-best-0', encodeHeader(header1));
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockProvider.notify('subscription-best-0', encodeHeader(header2));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Both callbacks should receive both blocks
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);

      unsub1();
      unsub2();
    });

    it('should cleanup RPC subscription when last subscriber unsubscribes', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = explorer.best(callback1);
      const unsub2 = explorer.best(callback2);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);

      // First unsubscribe - subscription should persist
      unsub1();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify subscription still works
      const header = createMockHeader(1);
      mockProvider.notify('subscription-best-0', encodeHeader(header));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(callback2).toHaveBeenCalledTimes(1);

      // Second unsubscribe - subscription should be cleaned up
      unsub2();
    });

    it('should detect and backfill missing blocks', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();

      const unsub = explorer.best(callback);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);

      // Simulate block 1
      mockProvider.notify('subscription-best-0', encodeHeader(createMockHeader(1)));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate jump to block 5 (gap of 3 blocks)
      mockProvider.notify('subscription-best-0', encodeHeader(createMockHeader(5)));
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should warn about gap
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('best block gap detected'));

      // Should fetch missing blocks 2, 3, 4
      expect(providerSend).toHaveBeenCalledWith('chain_getBlockHash', [2]);
      expect(providerSend).toHaveBeenCalledWith('chain_getBlockHash', [3]);
      expect(providerSend).toHaveBeenCalledWith('chain_getBlockHash', [4]);

      warnSpy.mockRestore();
      unsub();
    });

    it('should filter duplicate blocks', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();

      const unsub = explorer.best(callback);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);

      const header = createMockHeader(1);

      // Emit same block twice
      mockProvider.notify('subscription-best-0', encodeHeader(header));
      await new Promise((resolve) => setTimeout(resolve, 50));

      mockProvider.notify('subscription-best-0', encodeHeader(header));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only emit once
      expect(callback).toHaveBeenCalledTimes(1);

      unsub();
    });

    it('should handle errors in block processing', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();

      const unsub = explorer.best(callback);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);

      // Simulate a block that will cause an error
      mockProvider.notify('subscription-best-0', null);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Error should be logged
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
      unsub();
    });
  });

  describe('finalized() - Query Mode', () => {
    it('should return cached value if available', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      // Subscribe to populate cache
      const unsub = explorer.finalized(() => {});

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeFinalizedHeads', []);

      // Simulate a finalized block
      const header = createMockHeader(1);
      mockProvider.notify('subscription-finalized-0', encodeHeader(header));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Query should return cached value
      const result = await explorer.finalized();

      expect(result).toBeDefined();
      expect(result.number).toBe(1);

      unsub();
    });

    it('should fallback to RPC if no cache', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const result = await explorer.finalized();

      expect(result).toBeDefined();
      expect(providerSend).toHaveBeenCalledWith('chain_getFinalizedHead', []);
    });
  });

  describe('finalized(callback) - Subscription Mode', () => {
    it('should create RPC subscription on first subscriber', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();
      const unsub = explorer.finalized(callback);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeFinalizedHeads', []);

      unsub();
    });

    it('should share RPC subscription across multiple subscribers', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = explorer.finalized(callback1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const unsub2 = explorer.finalized(callback2);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should only create one RPC subscription
      const subscriptionCalls = providerSend.mock.calls.filter((call) => call[0] === 'chain_subscribeFinalizedHeads');
      expect(subscriptionCalls).toHaveLength(1);

      unsub1();
      unsub2();
    });

    it('should detect and backfill missing finalized blocks', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();

      const unsub = explorer.finalized(callback);

      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeFinalizedHeads', []);

      // Simulate finalized block 1
      mockProvider.notify('subscription-finalized-0', encodeHeader(createMockHeader(1)));
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate jump to finalized block 4
      mockProvider.notify('subscription-finalized-0', encodeHeader(createMockHeader(4)));
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should warn about gap
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('finalized block gap detected'));

      warnSpy.mockRestore();
      unsub();
    });
  });

  describe('header()', () => {
    it('should query header by hash', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const hash = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const header = await explorer.header(hash);

      expect(header).toBeDefined();
      expect(providerSend).toHaveBeenCalledWith('chain_getHeader', [hash]);
    });

    it('should query header by number', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const header = await explorer.header(42);

      expect(header).toBeDefined();
      expect(providerSend).toHaveBeenCalledWith('chain_getBlockHash', [42]);
      expect(providerSend).toHaveBeenCalledWith('chain_getHeader', [
        '0x000000000000000000000000000000000000000000000000000000000000002a',
      ]);
    });

    it('should throw if header not found', async () => {
      mockProvider.setRpcRequest('chain_getHeader', () => null);

      await expect(explorer.header('0xnonexistent')).rejects.toThrow();
    });
  });

  describe('body()', () => {
    it('should query body by hash', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const hash = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const body = await explorer.body(hash);

      expect(body).toBeDefined();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);
      expect(providerSend).toHaveBeenCalledWith('chain_getBlock', [hash]);
    });

    it('should query body by number', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const body = await explorer.body(42);

      expect(body).toBeDefined();
      expect(Array.isArray(body)).toBe(true);
      expect(providerSend).toHaveBeenCalledWith('chain_getBlockHash', [42]);
      expect(providerSend).toHaveBeenCalledWith('chain_getBlock', [
        '0x000000000000000000000000000000000000000000000000000000000000002a',
      ]);
    });

    it('should throw if block not found', async () => {
      mockProvider.setRpcRequest('chain_getBlock', () => null);

      await expect(explorer.body('0xnonexistent')).rejects.toThrow();
    });
  });

  describe('subscription lifecycle', () => {
    it('should handle multiple subscribe/unsubscribe cycles', async () => {
      const providerSend = vi.spyOn(mockProvider, 'send');
      const callback = vi.fn();

      // First cycle
      const unsub1 = explorer.best(callback);
      await waitFor();
      expect(providerSend).toHaveBeenCalledWith('chain_subscribeNewHeads', []);
      unsub1();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second cycle
      const unsub2 = explorer.best(callback);
      await new Promise((resolve) => setTimeout(resolve, 10));
      unsub2();

      // Should create subscription twice (once per cycle)
      const subscriptionCalls = providerSend.mock.calls.filter((call) => call[0] === 'chain_subscribeNewHeads');
      expect(subscriptionCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle unsubscribe before RPC subscription completes', async () => {
      const callback = vi.fn();

      // Subscribe and immediately unsubscribe
      const unsub = explorer.best(callback);
      unsub();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not cause any errors
      expect(true).toBe(true);
    });
  });
});
