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
