import { hexToU8a, u8aToHex } from '@polkadot/util';
import { HexString } from '@dedot/utils';
import { DecodeBuffer, EncodeBuffer, metadata, Shape, sizedUint8Array, hex } from '../subshape.js';
import { createShape } from './createShape.js';
import { compactU32 } from './compact.js';

const HEX_PREFIX = '0x';

export function FixedHex(lengthInBytes: number): Shape<HexString> {
  const shaped = hex(sizedUint8Array(lengthInBytes));

  const originalSubDecode = shaped.subDecode.bind(shaped);
  shaped.subDecode = function (buffer: DecodeBuffer): string {
    const decoded = originalSubDecode(buffer) as string;

    return decoded.startsWith(HEX_PREFIX) ? decoded : `${HEX_PREFIX}${decoded}`;
  };

  return shaped as Shape<HexString>;
}

export const PrefixedHex = createShape<HexString>({
  metadata: metadata('$.PrefixedHex'),
  staticSize: compactU32.staticSize,
  subEncode(buffer: EncodeBuffer, value): void {
    const u8a = hexToU8a(value);
    compactU32.subEncode(buffer, u8a.length);
    buffer.insertArray(u8a);
  },
  subDecode(buffer: DecodeBuffer) {
    const length = compactU32.subDecode(buffer);
    const value = buffer.array.subarray(buffer.index, buffer.index + length);
    buffer.index += length;
    return u8aToHex(value);
  },
});
