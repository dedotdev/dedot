import { HexString, hexToU8a, isHex, u8aToHex } from '@dedot/utils';
import { AssertState, constant, DecodeBuffer, metadata, Shape, ShapeAssertError, withMetadata } from '../deshape.js';
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
  subAssert(assert: AssertState) {
    assert.typeof(this, 'string');
    if (!isHex(assert.value as string)) {
      throw new ShapeAssertError(this, assert.value, `${assert.path}: Expected valid hex string`);
    }
  },
});

export const Null = withMetadata(metadata('$.Null'), constant(null));
