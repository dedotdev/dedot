import { describe, expect, expectTypeOf, it } from 'vitest';
import { $Metadata, MAGIC_NUMBER } from '@dedot/codecs';
import staticSubstrateV13 from '@polkadot/types-support/metadata/v13/substrate-hex';
import staticSubstrateV14 from '@polkadot/types-support/metadata/v14/substrate-hex';
import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { hexToString, numberToHex } from '@polkadot/util';
import { assert } from '@dedot/utils';

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
    const { metadataVersioned, version, versionNumber } = $Metadata.tryDecode(staticSubstrateV14);

    expect(version).toEqual('V14');
    expect(versionNumber).toEqual(14);

    expect(metadataVersioned.tag).toEqual('V14');

    assert(metadataVersioned.tag === 'V14');
    expectTypeOf(metadataVersioned.value.pallets).toBeArray();
    expectTypeOf(metadataVersioned.value.types).toBeArray();
    expectTypeOf(metadataVersioned.value.extrinsic).toBeObject();
    expectTypeOf(metadataVersioned.value.runtimeType).toBeNumber();
  });

  it('should decode metadata v15', () => {
    const metadata = $Metadata.tryDecode(staticSubstrateV15);

    expect(metadata.version).toEqual('V15');
    expect(metadata.versionNumber).toEqual(15);

    const { metadataVersioned } = metadata;
    expect(metadataVersioned.tag).toEqual('V15');

    assert(metadataVersioned.tag === 'V15');
    expectTypeOf(metadataVersioned.value.pallets).toBeArray();
    expectTypeOf(metadataVersioned.value.types).toBeArray();
    expectTypeOf(metadataVersioned.value.extrinsic).toBeObject();
    expectTypeOf(metadataVersioned.value.runtimeType).toBeNumber();
    expectTypeOf(metadataVersioned.value.apis).toBeArray();
    expectTypeOf(metadataVersioned.value.outerEnums).toBeObject();
    expectTypeOf(metadataVersioned.value.custom.map).toBeObject();
  });
});
