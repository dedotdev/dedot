import { DecodeBuffer, Shape, ShapeDecodeError } from '../deshape.js';

/**
 * Maximum number of zero-sized elements (e.g: `()`) a sequence is allowed to declare.
 *
 * Zero-sized elements do not consume any input, so their declared length
 * cannot be validated against the size of the input. We cap it instead.
 */
export const MAX_ZERO_SIZED_ELEMENTS = 65_536;

/**
 * Number of bytes left to read in the buffer.
 */
export const remainingBytes = (buffer: DecodeBuffer): number => {
  return Math.max(buffer.array.length - buffer.index, 0);
};

/**
 * Make sure the decoder did not read beyond the end of the input.
 *
 * Some primitive decoders (e.g: `u8`, `bool`, `compact`) do not fail when the input runs out,
 * they silently produce a value instead (`undefined`, `false`, `0`) and move the cursor forward.
 * A cursor that is beyond the end of the input means the decoded value was made up.
 */
export function assertInBounds(shape: Shape<any>, buffer: DecodeBuffer) {
  if (buffer.index > buffer.array.length) {
    throw new ShapeDecodeError(
      shape,
      buffer,
      `Unexpected end of input: attempting to decode beyond bounds of input bytes (${buffer.array.length} bytes)`,
    );
  }
}

/**
 * Decode `length` elements of a length-prefixed sequence (e.g: `Vec<T>`, `BTreeMap<K, V>`).
 *
 * The `length` comes from the input, so it must not be trusted:
 * a few bytes of input can declare a sequence of a billion elements.
 * We make sure the declared length is plausible before allocating & decoding,
 * and stop as soon as the input runs out.
 */
export function decodeElements<T>(shape: Shape<any>, $el: Shape<any, T>, buffer: DecodeBuffer, length: number): T[] {
  if (length === 0) return [];

  const remaining = remainingBytes(buffer);

  if (length > remaining) {
    // An element is either zero-sized or takes at least 1 byte,
    // so only a sequence of zero-sized elements can be longer than the remaining input.
    const start = buffer.index;
    const first = $el.subDecode(buffer);

    if (buffer.index !== start) {
      throw new ShapeDecodeError(
        shape,
        buffer,
        `Unexpected end of input: declared length ${length} exceeds the remaining input (${remaining} bytes)`,
      );
    }

    if (length > MAX_ZERO_SIZED_ELEMENTS) {
      throw new ShapeDecodeError(
        shape,
        buffer,
        `Declared length ${length} of zero-sized elements exceeds the limit (${MAX_ZERO_SIZED_ELEMENTS})`,
      );
    }

    const value: T[] = Array(length);
    value[0] = first;
    for (let i = 1; i < length; i++) {
      value[i] = $el.subDecode(buffer);
    }

    return value;
  }

  const size = buffer.array.length;
  const value: T[] = Array(length);
  for (let i = 0; i < length; i++) {
    value[i] = $el.subDecode(buffer);

    // Stop right away once the input runs out, the remaining elements are not there
    if (buffer.index > size) assertInBounds(shape, buffer);
  }

  return value;
}
