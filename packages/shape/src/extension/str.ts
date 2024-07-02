import { createShape, metadata, Shape, ShapeDecodeError } from '../deshape.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function FixedStr(lengthInBytes: number): Shape<string> {
  return createShape({
    metadata: metadata('$FixedStr', FixedStr, lengthInBytes),
    staticSize: lengthInBytes,
    subEncode(buffer, value) {
      buffer.insertArray(textEncoder.encode(value));
    },
    subDecode(buffer) {
      if (buffer.array.length < buffer.index + lengthInBytes) {
        throw new ShapeDecodeError(this, buffer, 'Attempting to `str`-decode beyond bounds of input bytes');
      }

      const slice = buffer.array.subarray(buffer.index, buffer.index + lengthInBytes);
      buffer.index += lengthInBytes;
      return textDecoder.decode(slice);
    },
    subAssert(assert) {
      assert.typeof(this, 'string');
    },
  });
}
