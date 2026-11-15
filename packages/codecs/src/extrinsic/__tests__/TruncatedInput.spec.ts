import staticSubstrateV15 from '@polkadot/types-support/metadata/v15/substrate-hex';
import * as $ from '@dedot/shape';
import { concatU8a, u8aToHex } from '@dedot/utils';
import { beforeAll, describe, expect, it } from 'vitest';
import { $Metadata, unwrapOpaqueMetadata } from '../../metadata/index.js';
import { PortableRegistry } from '../../registry/index.js';

/**
 * A few bytes of call data can declare a `Vec` of a billion elements without providing any of them.
 * The decoder must reject such input right away instead of looping over elements that are not there.
 */
describe('decoding truncated call data & extrinsics', () => {
  let registry: PortableRegistry;
  let $RuntimeCall: $.Shape<any>;
  let setStoragePrefix: Uint8Array;
  let validCall: Uint8Array;

  // Lengths an attacker can declare in a few bytes
  const HUGE_LENGTHS = [1024, 2 ** 20, 2 ** 24, 2 ** 26, 2 ** 30 - 1];

  const truncatedCall = (length: number) => concatU8a(setStoragePrefix, $.compactU32.encode(length));
  const unsignedExtrinsic = (call: Uint8Array) => {
    const body = concatU8a(new Uint8Array([4]), call); // version 4, unsigned
    return concatU8a($.compactU32.encode(body.length), body);
  };

  const expectFastRejection = (fn: () => unknown) => {
    const start = performance.now();
    expect(fn).toThrowError(/Unexpected end of input/);
    expect(performance.now() - start).toBeLessThan(500);
  };

  beforeAll(() => {
    const metadata = $Metadata.tryDecode(unwrapOpaqueMetadata(staticSubstrateV15));
    registry = new PortableRegistry(metadata.latest);
    $RuntimeCall = registry.findCodec(metadata.latest.extrinsic.callTypeId);

    // System.set_storage(items: Vec<(Bytes, Bytes)>)
    validCall = $RuntimeCall.tryEncode({
      pallet: 'System',
      palletCall: { name: 'SetStorage', params: { items: [['0x01', '0x02']] } },
    });
    setStoragePrefix = validCall.subarray(0, 2); // pallet index + call index
  });

  it('should decode a valid call & extrinsic', () => {
    expect(u8aToHex(validCall)).toEqual('0x00040404010402');

    const expectedCall = {
      pallet: 'System',
      palletCall: { name: 'SetStorage', params: { items: [['0x01', '0x02']] } },
    };

    expect($RuntimeCall.tryDecode(validCall)).toEqual(expectedCall);
    expect($RuntimeCall.tryDecode(u8aToHex(validCall))).toEqual(expectedCall);
    expect(registry.$Extrinsic.tryDecode(unsignedExtrinsic(validCall)).call).toEqual(expectedCall);
  });

  it('should reject a call declaring a huge Vec length without elements', () => {
    for (const length of HUGE_LENGTHS) {
      const input = truncatedCall(length);
      expect(input.length).toBeLessThanOrEqual(7);

      expectFastRejection(() => $RuntimeCall.tryDecode(input));
      expectFastRejection(() => $RuntimeCall.tryDecode(u8aToHex(input)));
    }
  });

  it('should reject an extrinsic declaring a huge Vec length without elements', () => {
    for (const length of HUGE_LENGTHS) {
      const input = unsignedExtrinsic(truncatedCall(length));
      expect(input.length).toBeLessThanOrEqual(9);

      expectFastRejection(() => registry.$Extrinsic.tryDecode(input));
      expectFastRejection(() => registry.$Extrinsic.tryDecode(u8aToHex(input)));
    }
  });

  it('should reject an extrinsic whose call reads beyond its length prefix', () => {
    // The length prefix covers the truncated call only; the bytes after it must not be consumed
    const input = concatU8a(unsignedExtrinsic(truncatedCall(2 ** 26)), new Uint8Array(4096));

    expectFastRejection(() => registry.$Extrinsic.tryDecode(input));
  });

  it('should reject a call that is cut off in the middle of its arguments', () => {
    // 00 04 | 04 | 04 01 | 04 02 -> cut inside the `items` argument
    for (let cut = 3; cut < validCall.length; cut += 1) {
      expect(() => $RuntimeCall.tryDecode(validCall.subarray(0, cut))).toThrowError(/Unexpected end of input/);
    }
  });
});
