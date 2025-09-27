import { LRUCache } from '@dedot/utils';
import { describe, expect, it, vi } from 'vitest';
import { SolRegistry } from '../SolRegistry.js';
import { TypinkRegistry } from '../TypinkRegistry.js';
import * as ensureUtils from '../utils/ensure.js';
import { FLIPPER_CONTRACT_METADATA_V5, FLIPPER_SOL_ABI } from './contracts-metadata.js';

const INK_CONTRACT_ADDRESS = '5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg';
const SOL_CONTRACT_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';

describe('Contract Presence Cache', () => {
  describe('Cache functionality in registries', () => {
    it('should initialize LRU cache in TypinkRegistry', () => {
      const registry = new TypinkRegistry(FLIPPER_CONTRACT_METADATA_V5 as any);

      expect(registry.cache).toBeInstanceOf(LRUCache);
      expect(registry.cache.capacity).toBe(500);
    });

    it('should initialize LRU cache in SolRegistry', () => {
      const registry = new SolRegistry(FLIPPER_SOL_ABI);

      expect(registry.cache).toBeInstanceOf(LRUCache);
      expect(registry.cache.capacity).toBe(500);
    });
  });

  describe('ensureContractPresence caching behavior', () => {
    it('should use cache when provided for contracts pallet', async () => {
      const cache = new LRUCache(500);
      const mockClient = {
        query: {
          contracts: {
            contractInfoOf: vi.fn().mockResolvedValue({
              trieId: '0x1234',
              depositAccount: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
              codeHash: '0x1234567890abcdef',
              storageBytes: 100,
              storageItems: 10,
            }),
          },
        },
      };

      // First call - should query storage
      await ensureUtils.ensureContractPresence(mockClient as any, false, INK_CONTRACT_ADDRESS, cache);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(1);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledWith(INK_CONTRACT_ADDRESS);

      // Verify cache was populated
      const cacheKey = `false::${INK_CONTRACT_ADDRESS}`;
      expect(cache.has(cacheKey)).toBe(true);
      expect(cache.get(cacheKey)).toBe(true);

      // Second call - should use cache
      await ensureUtils.ensureContractPresence(mockClient as any, false, INK_CONTRACT_ADDRESS, cache);

      // contractInfoOf should still have been called only once
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(1);
    });

    it('should use cache when provided for revive pallet', async () => {
      const cache = new LRUCache(500);

      const accountInfoOf = vi.fn().mockResolvedValue({
        nonce: 0,
        balance: 1000000n,
        accountType: {
          type: 'Contract',
          value: {
            trieId: '0x1234',
            depositAccount: '0xabcdef1234567890abcdef1234567890abcdef12',
            codeHash: '0x1234567890abcdef',
            storageBytes: 100,
            storageItems: 10,
          },
        },
      });

      Object.assign(accountInfoOf, { meta: {} }); // Simulate presence of meta to indicate newer pallet-revive

      const mockClient = {
        query: {
          revive: {
            accountInfoOf,
          },
        },
      };

      // First call - should query storage
      await ensureUtils.ensureContractPresence(mockClient as any, true, SOL_CONTRACT_ADDRESS, cache);
      expect(mockClient.query.revive.accountInfoOf).toHaveBeenCalledTimes(1);
      expect(mockClient.query.revive.accountInfoOf).toHaveBeenCalledWith(SOL_CONTRACT_ADDRESS);

      // Verify cache was populated
      const cacheKey = `true::${SOL_CONTRACT_ADDRESS}`;
      expect(cache.has(cacheKey)).toBe(true);
      expect(cache.get(cacheKey)).toBe(true);

      // Second call - should use cache
      await ensureUtils.ensureContractPresence(mockClient as any, true, SOL_CONTRACT_ADDRESS, cache);

      // accountInfoOf should still have been called only once
      expect(mockClient.query.revive.accountInfoOf).toHaveBeenCalledTimes(1);
    });

    it('should not use cache when cache is not provided', async () => {
      const mockClient = {
        query: {
          contracts: {
            contractInfoOf: vi.fn().mockResolvedValue({
              trieId: '0x1234',
              depositAccount: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
              codeHash: '0x1234567890abcdef',
              storageBytes: 100,
              storageItems: 10,
            }),
          },
        },
      };

      // First call
      await ensureUtils.ensureContractPresence(mockClient as any, false, INK_CONTRACT_ADDRESS);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(1);

      // Second call - should query again since no cache
      await ensureUtils.ensureContractPresence(mockClient as any, false, INK_CONTRACT_ADDRESS);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(2);
    });

    it('should use different cache keys for different addresses', async () => {
      const cache = new LRUCache(500);
      const mockClient = {
        query: {
          contracts: {
            contractInfoOf: vi.fn().mockResolvedValue({
              trieId: '0x1234',
              depositAccount: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
              codeHash: '0x1234567890abcdef',
              storageBytes: 100,
              storageItems: 10,
            }),
          },
        },
      };

      const address1 = '5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg';
      const address2 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

      // Query first address
      await ensureUtils.ensureContractPresence(mockClient as any, false, address1, cache);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(1);

      // Query second address - should not use cache from first
      await ensureUtils.ensureContractPresence(mockClient as any, false, address2, cache);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(2);

      // Verify both are cached separately
      expect(cache.has(`false::${address1}`)).toBe(true);
      expect(cache.has(`false::${address2}`)).toBe(true);

      // Query first address again - should use cache
      await ensureUtils.ensureContractPresence(mockClient as any, false, address1, cache);
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(2); // Still 2
    });

    it('should use different cache keys for revive vs contracts pallets', async () => {
      const cache = new LRUCache(500);

      const accountInfoOf = vi.fn().mockResolvedValue({
        nonce: 0,
        balance: 1000000n,
        accountType: {
          type: 'Contract',
          value: {
            trieId: '0x1234',
            depositAccount: '0xabcdef1234567890abcdef1234567890abcdef12',
            codeHash: '0x1234567890abcdef',
            storageBytes: 100,
            storageItems: 10,
          },
        },
      });

      Object.assign(accountInfoOf, { meta: {} }); // Simulate presence of meta to indicate newer pallet-revive

      // Set up mock client with both pallets
      const mockClient = {
        query: {
          contracts: {
            contractInfoOf: vi.fn().mockResolvedValue({
              trieId: '0x1234',
              depositAccount: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
              codeHash: '0x1234567890abcdef',
              storageBytes: 100,
              storageItems: 10,
            }),
          },
          revive: { accountInfoOf },
        },
      };

      // Same address but different pallets
      const address = '5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg';

      // Query with contracts pallet
      await ensureUtils.ensureContractPresence(mockClient as any, false, address, cache);
      expect(cache.has(`false::${address}`)).toBe(true);
      expect(cache.has(`true::${address}`)).toBe(false);

      // Query with revive pallet - should not use contracts cache
      await ensureUtils.ensureContractPresence(mockClient as any, true, address, cache);
      expect(cache.has(`false::${address}`)).toBe(true);
      expect(cache.has(`true::${address}`)).toBe(true);

      // Verify both queries were made
      expect(mockClient.query.contracts.contractInfoOf).toHaveBeenCalledTimes(1);
      expect(mockClient.query.revive.accountInfoOf).toHaveBeenCalledTimes(1);
    });

    it('should fallback to contractInfoOf when accountInfoOf not available', async () => {
      const mockClient = {
        query: {
          revive: {
            contractInfoOf: vi.fn().mockResolvedValue({
              trieId: '0x1234',
              depositAccount: '0xabcdef1234567890abcdef1234567890abcdef12',
              codeHash: '0x1234567890abcdef',
              storageBytes: 100,
              storageItems: 10,
            }),
          },
        },
      };

      await ensureUtils.ensureContractPresence(mockClient as any, true, SOL_CONTRACT_ADDRESS);
      expect(mockClient.query.revive.contractInfoOf).toHaveBeenCalledTimes(1);
    });

    it('should throw error when contract does not exist', async () => {
      const cache = new LRUCache(500);
      const mockClient = {
        query: {
          contracts: {
            contractInfoOf: vi.fn().mockResolvedValue(null), // Contract doesn't exist
          },
        },
      };

      await expect(
        ensureUtils.ensureContractPresence(mockClient as any, false, INK_CONTRACT_ADDRESS, cache),
      ).rejects.toThrow(`Contract with address ${INK_CONTRACT_ADDRESS} does not exist on chain!`);

      // Cache should not be populated for failed checks
      const cacheKey = `false::${INK_CONTRACT_ADDRESS}`;
      expect(cache.has(cacheKey)).toBe(false);
    });

    it('should throw error when revive account is not a contract', async () => {
      const cache = new LRUCache(500);

      const accountInfoOf = vi.fn().mockResolvedValue({
        nonce: 0,
        balance: 1000000n,
        accountType: {
          type: 'User', // Not a contract
          value: null,
        },
      });

      Object.assign(accountInfoOf, { meta: {} }); // Simulate presence of meta to indicate newer pallet-revive

      const mockClient = {
        query: {
          revive: {
            accountInfoOf,
          },
        },
      };

      await expect(
        ensureUtils.ensureContractPresence(mockClient as any, true, SOL_CONTRACT_ADDRESS, cache),
      ).rejects.toThrow(`Contract with address ${SOL_CONTRACT_ADDRESS} does not exist on chain!`);

      // Cache should not be populated for failed checks
      const cacheKey = `true::${SOL_CONTRACT_ADDRESS}`;
      expect(cache.has(cacheKey)).toBe(false);
    });
  });
});
