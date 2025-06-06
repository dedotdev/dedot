import staticSubstrateV13 from '@polkadot/types-support/metadata/v13/substrate-hex';
import staticSubstrateV14 from '@polkadot/types-support/metadata/v14/substrate-hex';
import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import { $Metadata, decodeOpaqueMetadata, MAGIC_NUMBER } from '@dedot/codecs';
import { assert, hexToString, numberToHex } from '@dedot/utils';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { westendMetadataV16 } from './shared.js';

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

    expect(metadataVersioned.type).toEqual('V14');

    assert(metadataVersioned.type === 'V14');
    expectTypeOf(metadataVersioned.value.pallets).toBeArray();
    expectTypeOf(metadataVersioned.value.types).toBeArray();
    expectTypeOf(metadataVersioned.value.extrinsic).toBeObject();
    expectTypeOf(metadataVersioned.value.runtimeType).toBeNumber();
  });

  it('should decode metadata v15', () => {
    const metadata = decodeOpaqueMetadata(staticSubstrateV15);

    expect(metadata.version).toEqual('V15');
    expect(metadata.versionNumber).toEqual(15);

    const { metadataVersioned } = metadata;
    expect(metadataVersioned.type).toEqual('V15');

    assert(metadataVersioned.type === 'V15');
    expectTypeOf(metadataVersioned.value.pallets).toBeArray();
    expectTypeOf(metadataVersioned.value.types).toBeArray();
    expectTypeOf(metadataVersioned.value.extrinsic).toBeObject();
    expectTypeOf(metadataVersioned.value.runtimeType).toBeNumber();
    expectTypeOf(metadataVersioned.value.apis).toBeArray();
    expectTypeOf(metadataVersioned.value.outerEnums).toBeObject();
    expectTypeOf(metadataVersioned.value.custom.map).toBeObject();
  });

  it('should decode metadata v16', () => {
    const metadata = $Metadata.tryDecode(westendMetadataV16);

    expect(metadata.version).toEqual('V16');
    expect(metadata.versionNumber).toEqual(16);

    const { metadataVersioned } = metadata;
    expect(metadataVersioned.type).toEqual('V16');

    assert(metadataVersioned.type === 'V16');
    expectTypeOf(metadataVersioned.value.pallets).toBeArray();
    expectTypeOf(metadataVersioned.value.types).toBeArray();
    expectTypeOf(metadataVersioned.value.extrinsic).toBeObject();
    expectTypeOf(metadataVersioned.value.apis).toBeArray();
    expectTypeOf(metadataVersioned.value.outerEnums).toBeObject();
    expectTypeOf(metadataVersioned.value.custom.map).toBeObject();
  });
});
