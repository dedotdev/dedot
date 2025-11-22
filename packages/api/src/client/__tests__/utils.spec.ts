import { $Header, Header, Metadata } from '@dedot/codecs';
import { blake2_256, keccak_256, u8aToHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { detectHasherFromHeader, detectHasherFromMetadata } from '../utils.js';

describe('detect hasher', () => {
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

      const result = detectHasherFromHeader(header, expectedHash);
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

      const result = detectHasherFromHeader(header, expectedHash);
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

      const result = detectHasherFromHeader(header, randomHash);
      expect(result).toBeUndefined();
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
