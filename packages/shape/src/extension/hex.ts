import { hexToU8a, u8aToHex } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';
import {
  AssertState,
  compact,
  createShape,
  DecodeBuffer,
  EncodeBuffer,
  hex as originalHex,
  metadata, Shape,
  sizedUint8Array,
  u32,
} from 'subshape';

const HEX_PREFIX = '0x';

const compactU32 = compact(u32);

export function hex(lengthInBytes: number): Shape<HexString> {
  const shaped = originalHex(sizedUint8Array(lengthInBytes));

  const originalSubDecode = shaped.subDecode.bind(shaped);
  shaped.subDecode = function (buffer: DecodeBuffer): string {
    const decoded = originalSubDecode(buffer) as string;

    return decoded.startsWith(HEX_PREFIX) ? decoded : `${HEX_PREFIX}${decoded}`;
  };

  return shaped as Shape<HexString>;
}

export const Hex = createShape<HexString>({
  metadata: metadata('$.Hex'),
  staticSize: 0,
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
  subAssert(state: AssertState): void {
    // TODO to implement
  },
});
