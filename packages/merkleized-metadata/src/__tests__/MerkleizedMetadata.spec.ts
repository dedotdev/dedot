import { $Metadata, Metadata } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { HexString, hexStripPrefix, hexToU8a, u8aToHex } from '@dedot/utils';
import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { MerkleizedMetadata } from '../MerkleizedMetadata.js';
import { DIGEST_FIXTURES, TX_PAYLOAD_PROOF_FIXTURES, TX_PROOF_FIXTURES } from './fixtures.js';

// Fixed chain information for all tests
const CHAIN_INFO = {
  decimals: 42,
  tokenSymbol: 'UNIT',
};

const loadMetadata = (fileName: string): HexString => {
  const metadataPath = path.join(__dirname, 'metadadata', fileName);
  const metadataHex = fs.readFileSync(metadataPath, 'utf-8') as HexString;
  return $.Option($.lenPrefixed($.RawHex)).decode(hexToU8a(hexStripPrefix(metadataHex.trim())))!;
};

describe('MerkleizedMetadata', () => {
  describe('digest', () => {
    DIGEST_FIXTURES.forEach(({ name, expectedHash }) => {
      it(`should calculate correct hash for ${name}`, () => {
        const metadata = loadMetadata(name);

        const merkleizer = new MerkleizedMetadata(metadata, CHAIN_INFO);

        expect(u8aToHex(merkleizer.digest())).toEqual(expectedHash);
      });
    });
  });

  describe('proofFor*', () => {
    let merkleizer: MerkleizedMetadata;
    beforeEach(() => {
      const metadata = loadMetadata('polkadot_metadata_v15');
      merkleizer = new MerkleizedMetadata(metadata, CHAIN_INFO);
    });

    describe('proofForExtrinsic', () => {
      it('should generate valid proof for an extrinsic', () => {
        TX_PROOF_FIXTURES.map(({ tx, expectedProof }) => {
          const proof = u8aToHex(merkleizer.proofForExtrinsic(tx as HexString));
          expect(proof).toEqual(expectedProof);
        });
      });

      it('should generate valid proof for an extrinsic with additional signed', () => {
        TX_PROOF_FIXTURES.map(({ tx, additionalSigned, expectedProofWithAdditionalSigned }) => {
          const proof = u8aToHex(merkleizer.proofForExtrinsic(tx as HexString, additionalSigned as HexString));
          expect(proof).toEqual(expectedProofWithAdditionalSigned);
        });
      });
    });

    describe('proofForExtrinsicPayload', () => {
      it('should generate valid proof for an extrinsic', () => {
        TX_PAYLOAD_PROOF_FIXTURES.map(({ txPayload, expectedProof }) => {
          const proof = u8aToHex(merkleizer.proofForExtrinsicPayload(txPayload as HexString));
          expect(proof).toEqual(expectedProof);
        });
      });

      it('should generate valid proof for an extrinsic with additional signed', () => {
        TX_PAYLOAD_PROOF_FIXTURES.map(({ txPayload, expectedProof }) => {
          const proof = u8aToHex(merkleizer.proofForExtrinsicPayload(txPayload as HexString));
          expect(proof).toEqual(expectedProof);
        });
      });
    });
  });

  describe('versioned transaction extensions', () => {
    // Retain the existing Polkadot golden vectors while adding a V5-only type
    // and storing the V4 extensions in a different order from their selection.
    const withVersionedExtensions = (reorder = true) => {
      const metadata = $Metadata.tryDecode(loadMetadata('polkadot_metadata_v15'));
      const latest = metadata.latest;
      const active = [...latest.extrinsic.signedExtensions];
      const v5TypeId = Math.max(...latest.types.map(({ id }) => id)) + 1;
      latest.types.push({
        id: v5TypeId,
        path: ['V5OnlyExtension'],
        params: [],
        docs: [],
        typeDef: { type: 'Tuple', value: { fields: [latest.extrinsic.callTypeId] } },
      });
      const indexes = active.map((_, index) => (reorder ? active.length - index : index + 1));
      latest.extrinsic = {
        ...latest.extrinsic,
        versions: [4, 5],
        signedExtensions: [
          { ident: 'V5OnlyExtension', typeId: v5TypeId, additionalSigned: v5TypeId },
          ...(reorder ? active.reverse() : active),
        ],
        signedExtensionsByVersion: new Map([
          [0, indexes],
          [1, [0, ...indexes]],
        ]),
      };
      return new Metadata(metadata.magicNumber, { type: 'V16', value: latest });
    };

    it.each([false, true])('preserves the V15 digest with V5-only types (reordered table: %s)', (reorder) => {
      const metadata = withVersionedExtensions(reorder);
      const merkleizer = new MerkleizedMetadata($Metadata.tryEncode(metadata), CHAIN_INFO);
      const expected = DIGEST_FIXTURES.find(({ name }) => name === 'polkadot_metadata_v15')!.expectedHash;
      expect(u8aToHex(merkleizer.digest())).toEqual(expected);
    });

    it('preserves the V15 transaction and payload proof vectors', () => {
      const merkleizer = new MerkleizedMetadata(withVersionedExtensions(), CHAIN_INFO);
      for (const { txPayload, expectedProof } of TX_PAYLOAD_PROOF_FIXTURES) {
        expect(u8aToHex(merkleizer.proofForExtrinsicPayload(txPayload as HexString))).toEqual(expectedProof);
      }
      for (const { tx, additionalSigned, expectedProof, expectedProofWithAdditionalSigned } of TX_PROOF_FIXTURES) {
        expect(u8aToHex(merkleizer.proofForExtrinsic(tx as HexString))).toEqual(expectedProof);
        expect(u8aToHex(merkleizer.proofForExtrinsic(tx as HexString, additionalSigned as HexString))).toEqual(
          expectedProofWithAdditionalSigned,
        );
      }
    });

    it('supports an empty version-zero set without selecting the other set', () => {
      const v16 = withVersionedExtensions();
      v16.latest.extrinsic.signedExtensionsByVersion.set(0, []);
      const v15 = $Metadata.tryDecode(loadMetadata('polkadot_metadata_v15'));
      if (v15.metadataVersioned.type !== 'V15') throw new Error('Expected V15 fixture');
      v15.metadataVersioned.value.extrinsic.signedExtensions = [];
      expect(new MerkleizedMetadata(v16, CHAIN_INFO).digest()).toEqual(
        new MerkleizedMetadata(v15, CHAIN_INFO).digest(),
      );
    });

    it('includes an extension and its types when selected in version zero', () => {
      const metadata = withVersionedExtensions();
      const without = new MerkleizedMetadata(metadata, CHAIN_INFO).digest();
      const indexes = metadata.latest.extrinsic.signedExtensionsByVersion.get(0)!;
      metadata.latest.extrinsic.signedExtensionsByVersion.set(0, [0, ...indexes]);
      expect(new MerkleizedMetadata(metadata, CHAIN_INFO).digest()).not.toEqual(without);
    });

    it('rejects a missing version-zero set', () => {
      const metadata = withVersionedExtensions();
      metadata.latest.extrinsic.signedExtensionsByVersion.delete(0);
      expect(() => new MerkleizedMetadata(metadata, CHAIN_INFO).digest()).toThrow(
        'No signed extensions found for extension version 0',
      );
    });

    it('rejects an out-of-range extension index with its version', () => {
      const metadata = withVersionedExtensions();
      const index = metadata.latest.extrinsic.signedExtensions.length;
      metadata.latest.extrinsic.signedExtensionsByVersion.set(0, [index]);
      expect(() => new MerkleizedMetadata(metadata, CHAIN_INFO).digest()).toThrow(
        `Invalid signed extension index ${index} for extension version 0`,
      );
    });
  });

  describe('constructor input types', () => {
    let metadataHex: HexString;
    let metadataU8a: Uint8Array;
    let metadataObject: Metadata;

    beforeEach(() => {
      // Load metadata in different formats
      metadataHex = loadMetadata('polkadot_metadata_v15');
      metadataU8a = hexToU8a(metadataHex);
      metadataObject = $Metadata.tryDecode(metadataHex);
    });

    describe('valid inputs', () => {
      it('should accept Metadata object directly', () => {
        const merkleizer = new MerkleizedMetadata(metadataObject, CHAIN_INFO);
        expect(merkleizer).toBeDefined();
        expect(merkleizer.digest()).toBeDefined();
      });

      it('should accept hex string and decode it', () => {
        const merkleizer = new MerkleizedMetadata(metadataHex, CHAIN_INFO);
        expect(merkleizer).toBeDefined();
        expect(merkleizer.digest()).toBeDefined();
      });

      it('should accept Uint8Array and decode it', () => {
        const merkleizer = new MerkleizedMetadata(metadataU8a, CHAIN_INFO);
        expect(merkleizer).toBeDefined();
        expect(merkleizer.digest()).toBeDefined();
      });

      it('should handle both hex with 0x prefix and raw hex data', () => {
        // Test with 0x prefix (standard hex string)
        const merkleizer1 = new MerkleizedMetadata(metadataHex, CHAIN_INFO);
        expect(merkleizer1).toBeDefined();
        expect(merkleizer1.digest()).toBeDefined();

        // Test that hex without prefix is treated as Metadata object, not hex string
        // This is expected behavior since isHex() requires 0x prefix
        const hexWithoutPrefix = hexStripPrefix(metadataHex);
        // This will throw because it's not a valid Metadata object
        expect(() => new MerkleizedMetadata(hexWithoutPrefix as any, CHAIN_INFO)).toThrow();
      });
    });

    describe('consistency across input types', () => {
      it('should produce identical digest for all input types', () => {
        const merkleizer1 = new MerkleizedMetadata(metadataObject, CHAIN_INFO);
        const merkleizer2 = new MerkleizedMetadata(metadataHex, CHAIN_INFO);
        const merkleizer3 = new MerkleizedMetadata(metadataU8a, CHAIN_INFO);

        const digest1 = u8aToHex(merkleizer1.digest());
        const digest2 = u8aToHex(merkleizer2.digest());
        const digest3 = u8aToHex(merkleizer3.digest());

        expect(digest1).toEqual(digest2);
        expect(digest2).toEqual(digest3);
      });

      it('should produce identical proofs for all input types', () => {
        const merkleizer1 = new MerkleizedMetadata(metadataObject, CHAIN_INFO);
        const merkleizer2 = new MerkleizedMetadata(metadataHex, CHAIN_INFO);
        const merkleizer3 = new MerkleizedMetadata(metadataU8a, CHAIN_INFO);

        const { tx, additionalSigned } = TX_PROOF_FIXTURES[0];

        const proof1 = u8aToHex(merkleizer1.proofForExtrinsic(tx as HexString, additionalSigned as HexString));
        const proof2 = u8aToHex(merkleizer2.proofForExtrinsic(tx as HexString, additionalSigned as HexString));
        const proof3 = u8aToHex(merkleizer3.proofForExtrinsic(tx as HexString, additionalSigned as HexString));

        expect(proof1).toEqual(proof2);
        expect(proof2).toEqual(proof3);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid hex string', () => {
        const invalidHex = '0xGGGG' as HexString; // Invalid hex characters
        expect(() => new MerkleizedMetadata(invalidHex, CHAIN_INFO)).toThrow();
      });

      it('should throw error for invalid Uint8Array', () => {
        const invalidU8a = new Uint8Array([0, 1, 2, 3]); // Too short to be valid metadata
        expect(() => new MerkleizedMetadata(invalidU8a, CHAIN_INFO)).toThrow();
      });

      it('should throw error for empty hex string', () => {
        const emptyHex = '0x' as HexString;
        expect(() => new MerkleizedMetadata(emptyHex, CHAIN_INFO)).toThrow();
      });

      it('should throw error for empty Uint8Array', () => {
        const emptyU8a = new Uint8Array(0);
        expect(() => new MerkleizedMetadata(emptyU8a, CHAIN_INFO)).toThrow();
      });

      it('should throw error for malformed metadata bytes', () => {
        // Create a Uint8Array that's long enough but not valid metadata
        const malformedU8a = new Uint8Array(100).fill(0xff);
        expect(() => new MerkleizedMetadata(malformedU8a, CHAIN_INFO)).toThrow();
      });
    });

    describe('multiple chains metadata', () => {
      it('should handle polkadot metadata', () => {
        const polkadotMetadata = loadMetadata('polkadot_metadata_v15');
        const merkleizer1 = new MerkleizedMetadata(polkadotMetadata, CHAIN_INFO);
        const merkleizer2 = new MerkleizedMetadata(hexToU8a(polkadotMetadata), CHAIN_INFO);
        const merkleizer3 = new MerkleizedMetadata($Metadata.tryDecode(polkadotMetadata), CHAIN_INFO);

        expect(u8aToHex(merkleizer1.digest())).toEqual(u8aToHex(merkleizer2.digest()));
        expect(u8aToHex(merkleizer2.digest())).toEqual(u8aToHex(merkleizer3.digest()));
      });

      it('should handle kusama metadata', () => {
        const kusamaMetadata = loadMetadata('kusama_metadata_v15');
        const merkleizer1 = new MerkleizedMetadata(kusamaMetadata, CHAIN_INFO);
        const merkleizer2 = new MerkleizedMetadata(hexToU8a(kusamaMetadata), CHAIN_INFO);
        const merkleizer3 = new MerkleizedMetadata($Metadata.tryDecode(kusamaMetadata), CHAIN_INFO);

        expect(u8aToHex(merkleizer1.digest())).toEqual(u8aToHex(merkleizer2.digest()));
        expect(u8aToHex(merkleizer2.digest())).toEqual(u8aToHex(merkleizer3.digest()));
      });

      it('should handle acala metadata', () => {
        const acalaMetadata = loadMetadata('acala_metadata_v15');
        const merkleizer1 = new MerkleizedMetadata(acalaMetadata, CHAIN_INFO);
        const merkleizer2 = new MerkleizedMetadata(hexToU8a(acalaMetadata), CHAIN_INFO);
        const merkleizer3 = new MerkleizedMetadata($Metadata.tryDecode(acalaMetadata), CHAIN_INFO);

        expect(u8aToHex(merkleizer1.digest())).toEqual(u8aToHex(merkleizer2.digest()));
        expect(u8aToHex(merkleizer2.digest())).toEqual(u8aToHex(merkleizer3.digest()));
      });
    });

    describe('chain info extraction', () => {
      it('should extract chain info correctly regardless of input type', () => {
        // Create merkleizers with partial chain info
        const partialChainInfo = { decimals: 10, tokenSymbol: 'DOT' };

        const merkleizer1 = new MerkleizedMetadata(metadataObject, partialChainInfo);
        const merkleizer2 = new MerkleizedMetadata(metadataHex, partialChainInfo);
        const merkleizer3 = new MerkleizedMetadata(metadataU8a, partialChainInfo);

        // All should produce the same digest (chain info extraction should be consistent)
        expect(u8aToHex(merkleizer1.digest())).toEqual(u8aToHex(merkleizer2.digest()));
        expect(u8aToHex(merkleizer2.digest())).toEqual(u8aToHex(merkleizer3.digest()));
      });
    });
  });
});
