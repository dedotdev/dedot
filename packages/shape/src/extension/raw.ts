import { isNumber, isString, numberToU8a, stringToU8a, u8aToHex, u8aToU8a } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';
import {
  AssertState,
  constant,
  createShape,
  DecodeBuffer,
  metadata,
  Shape,
  ShapeAssertError,
  withMetadata
} from 'subshape';

type BytesInput = string | number | Uint8Array;
const xToU8a = (input: BytesInput): Uint8Array => {
  if (isString(input)) {
    return stringToU8a(input);
  } else if (isNumber(input)) {
    return numberToU8a(input);
  }

  return u8aToU8a(input);
};

export const Bytes: Shape<BytesInput, Uint8Array> = createShape({
  metadata: metadata('$.Bytes'),
  staticSize: 0,
  subEncode(buffer, value) {
    buffer.insertArray(xToU8a(value));
  },
  subDecode(buffer: DecodeBuffer): Uint8Array {
    return buffer.array;
  },
  subAssert(assert: AssertState): void {
    assert.instanceof(this, Uint8Array);
  },
});

const hexRegex = /^(?:0x)?[\da-f]*$/i
export const RawHex: Shape<BytesInput, HexString> = createShape({
  metadata: metadata('$.RawHex'),
  staticSize: 0,
  subEncode(buffer, value) {
    buffer.insertArray(xToU8a(value));
  },
  subDecode(buffer: DecodeBuffer) {
    return u8aToHex(buffer.array);
  },
  subAssert(assert: AssertState): void {
    assert.typeof(this, "string");
    if (!hexRegex.test(assert.value as string)) {
      throw new ShapeAssertError(this as any, assert.value, `${assert.path}: invalid hex`)
    }
  },
});

export const Null = withMetadata(metadata('$.Null'), constant(null));
