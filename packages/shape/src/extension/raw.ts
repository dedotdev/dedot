import { HexString, hexToU8a, u8aToHex } from '@dedot/utils';
import { constant, DecodeBuffer, metadata, Shape, withMetadata } from '../deshape.js';
import { createShape } from './createShape.js';

export const RawHex: Shape<HexString> = createShape({
  metadata: metadata('$.RawHex'),
  staticSize: 0,
  subEncode(buffer, value) {
    buffer.insertArray(hexToU8a(value));
  },
  subDecode(buffer: DecodeBuffer) {
    const value = buffer.array.subarray(buffer.index);
    buffer.index += value.length;
    return u8aToHex(value);
  },
});

export const Null = withMetadata(metadata('$.Null'), constant(null));
