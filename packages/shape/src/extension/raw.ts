import { hexToU8a, u8aToHex } from '@polkadot/util';
import { HexString } from '@dedot/utils';
import { constant, DecodeBuffer, metadata, Shape, withMetadata } from '../subshape.js';
import { createShape } from './createShape.js';

export const RawHex: Shape<HexString> = createShape({
  metadata: metadata('$.RawHex'),
  staticSize: 0,
  subEncode(buffer, value) {
    buffer.insertArray(hexToU8a(value));
  },
  subDecode(buffer: DecodeBuffer) {
    return u8aToHex(buffer.array);
  },
});

export const Null = withMetadata(metadata('$.Null'), constant(null));
