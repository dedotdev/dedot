import { $Header, Header, Metadata } from '@dedot/codecs';
import { blake2_256, keccak_256, u8aToHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import {
  detectHasherFromBlockHeader,
  detectHasherFromMetadata,
  mapHasherNameToFn,
  SUPPORTED_HASHERS,
} from '../hasherDetection.js';

describe('hasherDetection', () => {
  describe('mapHasherNameToFn', () => {
    it('should map BlakeTwo256 to blake2_256', () => {
      expect(mapHasherNameToFn('BlakeTwo256')).toBe(blake2_256);
    });

    it('should map Keccak256 to keccak_256', () => {
      expect(mapHasherNameToFn('Keccak256')).toBe(keccak_256);
    });

    it('should return undefined for unknown hasher names', () => {
      expect(mapHasherNameToFn('UnknownHasher')).toBeUndefined();
      expect(mapHasherNameToFn('')).toBeUndefined();
      expect(mapHasherNameToFn('blake2_256')).toBeUndefined(); // lowercase doesn't match
    });
  });

  describe('detectHasherFromMetadata', () => {
    it('should detect BlakeTwo256 from V16 metadata', () => {
      // Create a mock V16 metadata with BlakeTwo256 hasher
      const mockMetadata = createMockMetadata('BlakeTwo256');
      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBe(blake2_256);
    });

    it('should detect Keccak256 from V16 metadata', () => {
      // Create a mock V16 metadata with Keccak256 hasher
      const mockMetadata = createMockMetadata('Keccak256');
      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBe(keccak_256);
    });

    it('should return undefined when System pallet is not found', () => {
      const mockMetadata = {
        latest: {
          pallets: [{ name: 'Balances', associatedTypes: [] }],
          types: [],
        },
      } as unknown as Metadata;

      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBeUndefined();
    });

    it('should return undefined when Hashing associated type is not found', () => {
      const mockMetadata = {
        latest: {
          pallets: [
            {
              name: 'System',
              associatedTypes: [{ name: 'AccountId', typeId: 0 }],
            },
          ],
          types: [{ path: ['sp_runtime', 'AccountId32'] }],
        },
      } as unknown as Metadata;

      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBeUndefined();
    });

    it('should return undefined when type definition is not found', () => {
      const mockMetadata = {
        latest: {
          pallets: [
            {
              name: 'System',
              associatedTypes: [{ name: 'Hashing', typeId: 100 }], // Type ID doesn't exist
            },
          ],
          types: [],
        },
      } as unknown as Metadata;

      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBeUndefined();
    });

    it('should return undefined for unknown hasher type', () => {
      const mockMetadata = createMockMetadata('UnknownHasher');
      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBeUndefined();
    });

    it('should handle empty associatedTypes', () => {
      const mockMetadata = {
        latest: {
          pallets: [
            {
              name: 'System',
              associatedTypes: [],
            },
          ],
          types: [],
        },
      } as unknown as Metadata;

      const result = detectHasherFromMetadata(mockMetadata);
      expect(result).toBeUndefined();
    });
  });

  describe('detectHasherFromBlockHeader', () => {
    it('should detect blake2_256 hasher from block header', () => {
      const header: Header = {
        parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        number: 1,
        stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        extrinsicsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        digest: { logs: [] },
      };

      // Calculate the expected hash with blake2_256
      const encodedHeader = $Header.tryEncode(header);
      const expectedHash = u8aToHex(blake2_256(encodedHeader));

      const result = detectHasherFromBlockHeader(header, expectedHash);
      expect(result).toBe(blake2_256);
    });

    it('should detect keccak_256 hasher from block header', () => {
      const header: Header = {
        parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        number: 1,
        stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        extrinsicsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        digest: { logs: [] },
      };

      // Calculate the expected hash with keccak_256
      const encodedHeader = $Header.tryEncode(header);
      const expectedHash = u8aToHex(keccak_256(encodedHeader));

      const result = detectHasherFromBlockHeader(header, expectedHash);
      expect(result).toBe(keccak_256);
    });

    it('should return undefined when no hasher matches', () => {
      const header: Header = {
        parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        number: 1,
        stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        extrinsicsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        digest: { logs: [] },
      };

      // Use a random hash that doesn't match any hasher
      const randomHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const result = detectHasherFromBlockHeader(header, randomHash);
      expect(result).toBeUndefined();
    });

    it('should use custom hashers list when provided', () => {
      const header: Header = {
        parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        number: 1,
        stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        extrinsicsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        digest: { logs: [] },
      };

      // Calculate the expected hash with keccak_256
      const encodedHeader = $Header.tryEncode(header);
      const expectedHash = u8aToHex(keccak_256(encodedHeader));

      // Only provide blake2_256 in the list - should not find a match
      const result = detectHasherFromBlockHeader(header, expectedHash, [blake2_256]);
      expect(result).toBeUndefined();

      // Now include keccak_256 - should find it
      const result2 = detectHasherFromBlockHeader(header, expectedHash, [blake2_256, keccak_256]);
      expect(result2).toBe(keccak_256);
    });

    it('should prioritize hashers based on order in list', () => {
      const header: Header = {
        parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        number: 1,
        stateRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        extrinsicsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        digest: { logs: [] },
      };

      // Calculate the expected hash with blake2_256
      const encodedHeader = $Header.tryEncode(header);
      const expectedHash = u8aToHex(blake2_256(encodedHeader));

      // blake2_256 is first in list, should be found first
      const result = detectHasherFromBlockHeader(header, expectedHash, [blake2_256, keccak_256]);
      expect(result).toBe(blake2_256);
    });
  });

  describe('SUPPORTED_HASHERS', () => {
    it('should contain blake2_256 and keccak_256', () => {
      expect(SUPPORTED_HASHERS).toContain(blake2_256);
      expect(SUPPORTED_HASHERS).toContain(keccak_256);
      expect(SUPPORTED_HASHERS).toHaveLength(2);
    });
  });
});

// Helper function to create mock metadata
function createMockMetadata(hasherName: string): Metadata {
  return {
    latest: {
      pallets: [
        {
          name: 'System',
          associatedTypes: [{ name: 'Hashing', typeId: 0 }],
        },
      ],
      types: [
        {
          path: ['sp_runtime', 'traits', hasherName],
        },
      ],
    },
  } as unknown as Metadata;
}
