import { LegacyClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { RpcVersion } from '@dedot/codecs/types';
import * as $ from '@dedot/shape';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Contract } from '../Contract.js';
import { GenericContractApi } from '../types/index.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  RANDOM_CONTRACT_ADDRESS,
} from './contracts-metadata.js';

type ContractApi = GenericContractApi<SubstrateApi, 'ink'>;

describe('Contract Storage API', () => {
  let api: LegacyClient, provider: MockProvider, contract: Contract<ContractApi>;

  describe('with metadata v5', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      contract = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);
    });

    describe('lazy()', () => {
      it('should return empty object for non-lazy storage types', () => {
        // The Flipper contract has a simple boolean value, which is not a lazy storage type
        const result = contract.storage.lazy();

        // For non-lazy storage types, lazy() should return an empty object
        expect(result).toEqual({});
      });

      it('should return lazy storage structure when codec is available', () => {
        // Mock the createLazyCodec method to return a codec with a value property
        const mockCodec = $.Struct({ value: $.bool });
        const originalCreateLazyCodec = contract.registry.createLazyCodec;
        contract.registry.createLazyCodec = vi.fn().mockReturnValue(mockCodec);

        const result = contract.storage.lazy();

        // Should return the structure from the codec
        expect(result).toHaveProperty('value');

        // Restore the original method
        contract.registry.createLazyCodec = originalCreateLazyCodec;
      });
    });
  });

  describe('with metadata v4', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      contract = new Contract(api, FLIPPER_CONTRACT_METADATA_V4, RANDOM_CONTRACT_ADDRESS);
    });

    it('should throw error for root() with unsupported metadata version', async () => {
      await expect(contract.storage.root()).rejects.toThrow(
        'Contract Storage Api Only Available for metadata version >= 5, current version: 4',
      );
    });

    it('should throw error for lazy() with unsupported metadata version', () => {
      expect(() => contract.storage.lazy()).toThrow(
        'Contract Storage Api Only Available for metadata version >= 5, current version: 4',
      );
    });
  });

  describe('with lazy storage types', () => {
    it('should handle lazy storage types in lazy()', () => {
      // Create a contract with the metadata
      const contract = new Contract<ContractApi>(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);

      // Create a simple mock codec that returns a fixed object
      const mockCodec = {
        tryDecode: () => ({ value: true, counter: 42 }),
      };

      // Mock the createLazyCodec method
      const originalCreateLazyCodec = contract.registry.createLazyCodec;
      contract.registry.createLazyCodec = vi.fn().mockReturnValue(mockCodec);

      // Test lazy() returns the structure
      const lazyStorage = contract.storage.lazy();
      expect(lazyStorage).toEqual({ value: true, counter: 42 });

      // Restore the original method
      contract.registry.createLazyCodec = originalCreateLazyCodec;
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
    });

    it('should handle missing root key in metadata', async () => {
      // Create a metadata with missing root key
      const invalidMetadata = {
        ...FLIPPER_CONTRACT_METADATA_V5,
        storage: {
          root: {
            // Missing root_key
            ty: 1,
            layout: {
              struct: {
                fields: [],
                name: 'Flipper',
              },
            },
          },
        },
      };

      const invalidContract = new Contract<ContractApi>(api, invalidMetadata, RANDOM_CONTRACT_ADDRESS);

      // Should throw an error when root key is missing
      await expect(invalidContract.storage.root()).rejects.toThrow();
    });
  });
});
