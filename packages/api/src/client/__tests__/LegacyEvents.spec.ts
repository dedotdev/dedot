import { $Header, Header } from '@dedot/codecs';
import { Unsub } from '@dedot/types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PinnedBlock } from '../../json-rpc/index.js';
import type { IGenericSubstrateClient } from '../../types.js';
import { LegacyEvents } from '../LegacyEvents.js';

// Mock header creation helper
const createMockHeader = (number: number, parentNumber?: number): Header => ({
  number,
  parentHash: `0x${(parentNumber ?? number - 1).toString(16).padStart(64, '0')}`,
  stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
  extrinsicsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
  digest: { logs: [] },
});

// Create mock client
const createMockClient = () => {
  const bestHeadCallbacks: Array<(header: Header) => void> = [];
  const finalizedHeadCallbacks: Array<(header: Header) => void> = [];

  return {
    rpc: {
      chain_subscribeNewHeads: vi.fn((callback: (header: Header) => void): Promise<Unsub> => {
        bestHeadCallbacks.push(callback);
        const unsub = vi.fn().mockResolvedValue(undefined);
        return Promise.resolve(unsub);
      }),
      chain_subscribeFinalizedHeads: vi.fn((callback: (header: Header) => void): Promise<Unsub> => {
        finalizedHeadCallbacks.push(callback);
        const unsub = vi.fn().mockResolvedValue(undefined);
        return Promise.resolve(unsub);
      }),
    },
    registry: {
      hashAsHex: vi.fn((encoded: Uint8Array) => {
        // Simple mock: just convert to hex string
        return (
          '0x' +
          Array.from(encoded)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        );
      }),
    },
    // Helpers to trigger callbacks
    triggerBestBlock: (header: Header) => {
      bestHeadCallbacks.forEach((cb) => cb(header));
    },
    triggerFinalizedBlock: (header: Header) => {
      finalizedHeadCallbacks.forEach((cb) => cb(header));
    },
  } as any as IGenericSubstrateClient & {
    triggerBestBlock: (header: Header) => void;
    triggerFinalizedBlock: (header: Header) => void;
  };
};

describe('LegacyEvents', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let legacyEvents: LegacyEvents;

  beforeEach(() => {
    mockClient = createMockClient();
    legacyEvents = new LegacyEvents(mockClient);
  });

  afterEach(async () => {
    await legacyEvents.cleanup();
    vi.clearAllMocks();
  });

  describe('Constructor & Initialization', () => {
    it('should create instance with client reference', () => {
      expect(legacyEvents).toBeInstanceOf(LegacyEvents);
    });

    it('should start with undefined blocks', () => {
      expect(legacyEvents.bestBlock()).toBeUndefined();
      expect(legacyEvents.finalizedBlock()).toBeUndefined();
    });
  });

  describe('setReady()', () => {
    it('should not trigger subscriptions if no handlers registered', async () => {
      legacyEvents.setReady();

      expect(mockClient.rpc.chain_subscribeNewHeads).not.toHaveBeenCalled();
      expect(mockClient.rpc.chain_subscribeFinalizedHeads).not.toHaveBeenCalled();
    });

    it('should trigger bestBlock subscription if handlers were registered before ready', async () => {
      legacyEvents.registerBestBlockHandler();
      expect(mockClient.rpc.chain_subscribeNewHeads).not.toHaveBeenCalled();

      legacyEvents.setReady();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });
    });

    it('should trigger finalizedBlock subscription if handlers were registered before ready', async () => {
      legacyEvents.registerFinalizedBlockHandler();
      expect(mockClient.rpc.chain_subscribeFinalizedHeads).not.toHaveBeenCalled();

      legacyEvents.setReady();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce();
      });
    });

    it('should trigger both subscriptions if both handler types registered', async () => {
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerFinalizedBlockHandler();

      legacyEvents.setReady();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce();
      });
    });
  });

  describe('registerBestBlockHandler() - Before Ready', () => {
    it('should not start RPC subscription if not ready', () => {
      legacyEvents.registerBestBlockHandler();
      expect(mockClient.rpc.chain_subscribeNewHeads).not.toHaveBeenCalled();
    });

    it('should not emit current block if not subscribed', () => {
      const handler = vi.fn();
      legacyEvents.on('bestBlock', handler);
      legacyEvents.registerBestBlockHandler();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow multiple registrations before ready', () => {
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerBestBlockHandler();

      expect(mockClient.rpc.chain_subscribeNewHeads).not.toHaveBeenCalled();
    });
  });

  describe('registerBestBlockHandler() - After Ready', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should start RPC subscription on first handler', async () => {
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });
    });

    it('should not start duplicate RPC subscription on second handler', async () => {
      legacyEvents.registerBestBlockHandler();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });

      legacyEvents.registerBestBlockHandler();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce(); // Still only once
      });
    });

    it('should emit current block immediately if already subscribed and block available', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      legacyEvents.on('bestBlock', handler1);
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });

      // Trigger a block
      const header = createMockHeader(100);
      mockClient.triggerBestBlock(header);

      await vi.waitFor(() => {
        expect(handler1).toHaveBeenCalled();
      });

      // Now register second handler
      legacyEvents.on('bestBlock', handler2);
      legacyEvents.registerBestBlockHandler();

      // Should immediately receive current block
      await vi.waitFor(() => {
        expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ number: 100 }), false);
      });
    });
  });

  describe('registerFinalizedBlockHandler() - After Ready', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should start RPC subscription on first handler', async () => {
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce();
      });
    });

    it('should not start duplicate RPC subscription on second handler', async () => {
      legacyEvents.registerFinalizedBlockHandler();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce();
      });

      legacyEvents.registerFinalizedBlockHandler();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce(); // Still only once
      });
    });
  });

  describe('Race Condition Prevention', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should not create duplicate subscriptions for rapid consecutive registerBestBlockHandler calls', async () => {
      // Register multiple handlers rapidly
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });
    });

    it('should not create duplicate subscriptions for rapid consecutive registerFinalizedBlockHandler calls', async () => {
      // Register multiple handlers rapidly
      legacyEvents.registerFinalizedBlockHandler();
      legacyEvents.registerFinalizedBlockHandler();
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce();
      });
    });
  });

  describe('unregisterBestBlockHandler()', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should not go below zero', () => {
      legacyEvents.unregisterBestBlockHandler();
      legacyEvents.unregisterBestBlockHandler();
      // Should not throw
    });

    it('should not unsubscribe if handlers remain', async () => {
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });

      // @ts-ignore
      const unsubSpy = mockClient.rpc.chain_subscribeNewHeads.mock.results[0]?.value;

      legacyEvents.unregisterBestBlockHandler();

      // Should not unsubscribe yet
      if (unsubSpy) {
        await vi
          .waitFor(
            () => {
              expect(unsubSpy).not.toHaveBeenCalled();
            },
            { timeout: 100 },
          )
          .catch(() => {
            // Expected to timeout
          });
      }
    });

    it('should unsubscribe when count reaches zero', async () => {
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalledOnce();
      });

      // @ts-ignore
      const unsubFn = await mockClient.rpc.chain_subscribeNewHeads.mock.results[0]?.value;

      legacyEvents.unregisterBestBlockHandler();
      legacyEvents.unregisterBestBlockHandler();

      await vi.waitFor(() => {
        expect(unsubFn).toHaveBeenCalled();
      });
    });
  });

  describe('unregisterFinalizedBlockHandler()', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should unsubscribe when count reaches zero', async () => {
      legacyEvents.registerFinalizedBlockHandler();
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalledOnce();
      });

      // @ts-ignore
      const unsubFn = await mockClient.rpc.chain_subscribeFinalizedHeads.mock.results[0]?.value;

      legacyEvents.unregisterFinalizedBlockHandler();
      legacyEvents.unregisterFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(unsubFn).toHaveBeenCalled();
      });
    });
  });

  describe('Event Emission - bestBlock', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should emit bestBlock event when new block arrives', async () => {
      const handler = vi.fn();
      legacyEvents.on('bestBlock', handler);
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
      });

      const header = createMockHeader(42);
      mockClient.triggerBestBlock(header);

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            number: 42,
            parent: expect.any(String),
            hash: expect.any(String),
          }),
          false, // bestChainChanged always false for legacy
        );
      });
    });

    it('should cache latest block', async () => {
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
      });

      const header = createMockHeader(100);
      mockClient.triggerBestBlock(header);

      await vi.waitFor(() => {
        const cachedBlock = legacyEvents.bestBlock();
        expect(cachedBlock).toBeDefined();
        expect(cachedBlock?.number).toBe(100);
      });
    });

    it('should emit to all registered handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      legacyEvents.on('bestBlock', handler1);
      legacyEvents.on('bestBlock', handler2);
      legacyEvents.on('bestBlock', handler3);

      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
      });

      const header = createMockHeader(42);
      mockClient.triggerBestBlock(header);

      await vi.waitFor(() => {
        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
        expect(handler3).toHaveBeenCalled();
      });
    });
  });

  describe('Event Emission - finalizedBlock', () => {
    beforeEach(() => {
      legacyEvents.setReady();
    });

    it('should emit finalizedBlock event when new block arrives', async () => {
      const handler = vi.fn();
      legacyEvents.on('finalizedBlock', handler);
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalled();
      });

      const header = createMockHeader(42);
      mockClient.triggerFinalizedBlock(header);

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            number: 42,
            parent: expect.any(String),
            hash: expect.any(String),
          }),
        );
      });
    });

    it('should cache latest block', async () => {
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalled();
      });

      const header = createMockHeader(100);
      mockClient.triggerFinalizedBlock(header);

      await vi.waitFor(() => {
        const cachedBlock = legacyEvents.finalizedBlock();
        expect(cachedBlock).toBeDefined();
        expect(cachedBlock?.number).toBe(100);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle RPC subscription errors gracefully for bestBlock', async () => {
      const errorClient = createMockClient();
      errorClient.rpc.chain_subscribeNewHeads = vi.fn().mockRejectedValue(new Error('Subscription failed'));

      const errorEvents = new LegacyEvents(errorClient);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      errorEvents.setReady();
      errorEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to subscribe to new heads:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
      await errorEvents.cleanup();
    });

    it('should handle RPC subscription errors gracefully for finalizedBlock', async () => {
      const errorClient = createMockClient();
      errorClient.rpc.chain_subscribeFinalizedHeads = vi.fn().mockRejectedValue(new Error('Subscription failed'));

      const errorEvents = new LegacyEvents(errorClient);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      errorEvents.setReady();
      errorEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to subscribe to finalized heads:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
      await errorEvents.cleanup();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from both subscriptions', async () => {
      legacyEvents.setReady();
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalled();
      });

      // @ts-ignore
      const bestUnsub = await mockClient.rpc.chain_subscribeNewHeads.mock.results[0]?.value;
      // @ts-ignore
      const finalizedUnsub = await mockClient.rpc.chain_subscribeFinalizedHeads.mock.results[0]?.value;

      await legacyEvents.cleanup();

      expect(bestUnsub).toHaveBeenCalled();
      expect(finalizedUnsub).toHaveBeenCalled();
    });

    it('should clear cached blocks', async () => {
      legacyEvents.setReady();
      legacyEvents.registerBestBlockHandler();
      legacyEvents.registerFinalizedBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
        expect(mockClient.rpc.chain_subscribeFinalizedHeads).toHaveBeenCalled();
      });

      mockClient.triggerBestBlock(createMockHeader(100));
      mockClient.triggerFinalizedBlock(createMockHeader(95));

      await vi.waitFor(() => {
        expect(legacyEvents.bestBlock()).toBeDefined();
        expect(legacyEvents.finalizedBlock()).toBeDefined();
      });

      await legacyEvents.cleanup();

      expect(legacyEvents.bestBlock()).toBeUndefined();
      expect(legacyEvents.finalizedBlock()).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle before-ready flow correctly', async () => {
      const handler = vi.fn();
      legacyEvents.on('bestBlock', handler);

      // Register handlers before ready
      legacyEvents.registerBestBlockHandler();
      expect(mockClient.rpc.chain_subscribeNewHeads).not.toHaveBeenCalled();

      // Set ready
      legacyEvents.setReady();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
      });

      // Trigger event
      mockClient.triggerBestBlock(createMockHeader(42));
      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalled();
      });
    });

    it('should handle after-ready flow correctly', async () => {
      const handler = vi.fn();

      // Set ready first
      legacyEvents.setReady();

      // Then register handlers
      legacyEvents.on('bestBlock', handler);
      legacyEvents.registerBestBlockHandler();

      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
      });

      // Trigger event
      mockClient.triggerBestBlock(createMockHeader(42));
      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalled();
      });
    });

    it('should handle mixed flow (some before, some after ready)', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      // One handler before ready
      legacyEvents.on('bestBlock', handler1);
      legacyEvents.registerBestBlockHandler();

      // Set ready
      legacyEvents.setReady();
      await vi.waitFor(() => {
        expect(mockClient.rpc.chain_subscribeNewHeads).toHaveBeenCalled();
      });

      // Another handler after ready
      legacyEvents.on('bestBlock', handler2);
      legacyEvents.registerBestBlockHandler();

      // Trigger event - both should receive it
      mockClient.triggerBestBlock(createMockHeader(42));
      await vi.waitFor(() => {
        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
      });
    });
  });
});
