import { $Metadata, unwrapOpaqueMetadata } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { HexString, hexStripPrefix, hexToU8a } from '@dedot/utils';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { MerkleizedMetatada } from '../MerkleizedMetatada.js';

describe('MerkleizedMetatada', () => {
  // Define fixtures with metadata file names and expected hashes
  const FIXTURES = [
    {
      name: 'rococo_metadata_v15',
      expectedHash: '0x6619a31025a9a14086a34da4ede7ed61258b9f55c12baae8bc801317869d2dfb',
    },
    {
      name: 'polkadot_metadata_v15',
      expectedHash: '0x72b3e70cb722edeb45a9380720ecad79b09b4113ab2dee5f5d974f170fb77a7e',
    },
    {
      name: 'kusama_metadata_v15',
      expectedHash: '0x23d7a31034edf29f4a5977ffc3075aba8087c422026e9bf4aaea8bc8192d6a23',
    },
    {
      name: 'acala_metadata_v15',
      expectedHash: '0xbd64dee496517c5288c47014fe0f57c2e12e42a7d627caeafa95e9f992e7e774',
    },
    {
      name: 'moonbeam_metadata_v15',
      expectedHash: '0x1339dc558887eb12f454586ef324c36bd3a1990000e17fbba6311f6ae55af676',
    },
    {
      name: 'hydradx_metadata_v15',
      expectedHash: '0xa11f4b8cb2515bf5dc0f8f7c04c0602d72e97892c562dafc3bb1d526d36ab838',
    },
  ];

  // Fixed chain information for all tests
  const chainInfo = {
    specVersion: 1,
    specName: 'nice',
    ss58Prefix: 1,
    decimals: 1,
    tokenSymbol: 'lol',
  };

  // Test each fixture
  FIXTURES.forEach(({ name, expectedHash }) => {
    it(`should calculate correct hash for ${name}`, () => {
      // Load metadata file
      const metadataPath = path.join(__dirname, 'metadadata', name);
      const metadataHex = fs.readFileSync(metadataPath, 'utf-8') as HexString;
      const metadata = $.Option($.lenPrefixed($.RawHex)).decode(hexToU8a(hexStripPrefix(metadataHex.trim())));

      const merkleizer = new MerkleizedMetatada(metadata!, chainInfo);

      // // Calculate hash and verify
      const hash = merkleizer.digest();
      expect(hash).toEqual(expectedHash);
    });
  });
});
