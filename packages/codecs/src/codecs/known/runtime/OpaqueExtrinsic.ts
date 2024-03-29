import * as $ from '@dedot/shape';
import { HexString, toU8a, u8aToHex } from '@dedot/utils';

// TODO docs!
export type OpaqueExtrinsicLike = HexString | string | Uint8Array;
export type OpaqueExtrinsic = HexString;

export const $OpaqueExtrinsic = $.createShape<OpaqueExtrinsicLike, OpaqueExtrinsic>({
  metadata: $.metadata('$OpaqueExtrinsic'),
  staticSize: $.compactU32.staticSize,
  subEncode(buffer: $.EncodeBuffer, value): void {
    const u8a = toU8a(value);

    // make sure the value if len-prefixed
    const buf = new $.EncodeBuffer($.compactU32.staticSize);
    $.compactU32.subEncode(buf, u8a.length);

    buffer.insertArray(u8a);
  },
  subDecode(buffer: $.DecodeBuffer) {
    const length = $.compactU32.subDecode(buffer);
    const lengthSize = $.compactU32.encode(length).length;

    const value = buffer.array.subarray(buffer.index - lengthSize, buffer.index + length);
    buffer.index += length;
    return u8aToHex(value);
  },
});

export const $UncheckedExtrinsic = $OpaqueExtrinsic;
export type UncheckedExtrinsicLike = $.Input<typeof $UncheckedExtrinsic>;
export type UncheckedExtrinsic = $.Output<typeof $UncheckedExtrinsic>;
