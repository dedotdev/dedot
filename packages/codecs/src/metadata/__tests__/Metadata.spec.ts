import { describe, expect, expectTypeOf, it } from 'vitest';
import { $Metadata, MAGIC_NUMBER } from '@delightfuldot/codecs';
import staticSubstrateV13 from '@polkadot/types-support/metadata/v13/substrate-hex';
import staticSubstrateV14 from '@polkadot/types-support/metadata/v14/substrate-hex';
import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { hexToString, numberToHex } from '@polkadot/util';

describe('$Metadata', () => {
  it('should verify magic number', () => {
    expect(hexToString(numberToHex(MAGIC_NUMBER)).split('').reverse().join('')).toEqual('meta');
  });

  it('should not support earlier versions (< V14)', () => {
    expect(() => {
      $Metadata.tryDecode(staticSubstrateV13);
    }).toThrowError('Metadata V13 is not supported');
  });

  it('should decode metadata v14', () => {
    const { metadataVersioned } = $Metadata.tryDecode(staticSubstrateV14);
    expect(metadataVersioned.tag).toEqual('V14');
    expectTypeOf(metadataVersioned.value.pallets).toBeArray();
    expectTypeOf(metadataVersioned.value.types).toBeArray();
    expectTypeOf(metadataVersioned.value.extrinsic).toBeObject();
    expectTypeOf(metadataVersioned.value.runtimeType).toBeNumber();
  });

  it('Metadata V15 is coming soon', () => {
    expect(() => {
      $Metadata.tryDecode(staticSubstrateV15);
    }).toThrowError('Metadata V15 support is coming soon');
  });
});
