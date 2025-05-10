import * as $ from '@dedot/shape';
import { HexString, hexStripPrefix, hexToU8a, u8aToHex } from '@dedot/utils';
import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { MerkleizedMetatada } from '../MerkleizedMetatada.js';
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

describe('MerkleizedMetatada', () => {
  describe('digest', () => {
    DIGEST_FIXTURES.forEach(({ name, expectedHash }) => {
      it(`should calculate correct hash for ${name}`, () => {
        const metadata = loadMetadata(name);

        const merkleizer = new MerkleizedMetatada(metadata, CHAIN_INFO);

        expect(u8aToHex(merkleizer.digest())).toEqual(expectedHash);
      });
    });
  });

  describe('proofFor*', () => {
    let merkleizer: MerkleizedMetatada;
    beforeEach(() => {
      const metadata = loadMetadata('polkadot_metadata_v15');
      merkleizer = new MerkleizedMetatada(metadata, CHAIN_INFO);
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
});
