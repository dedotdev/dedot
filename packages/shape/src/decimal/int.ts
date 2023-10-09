import { createShape, metadata, Shape } from 'subshape';

function _intNumber(signed: boolean, size: 8 | 16 | 32): Shape<number> {
  const byteSize = size / 8;
  const key = `${signed ? 'Int' : 'Uint'}${size}` as const;
  const getMethod = DataView.prototype[`get${key}`];
  const setMethod = DataView.prototype[`set${key}`];
  const min = signed ? -(2 ** (size - 1)) : 0;
  const max = 2 ** (size - +signed) - 1;

  return createShape({
    metadata: intMetadata(signed, size),
    staticSize: byteSize,
    subEncode(buffer, value) {
      setMethod.call(buffer.view, buffer.index, value);
      buffer.index += byteSize;
    },
    subDecode(buffer) {
      const value = getMethod.call(buffer.view, buffer.index);
      buffer.index += byteSize;
      return value;
    },
    subAssert(assert) {
      assert.typeof(this, 'number');
      assert.integer(this, min, max);
    },
  });
}

function intMetadata<T extends number | bigint>(signed: boolean, size: number) {
  return metadata<T, T>(
    metadata(`$.${signed ? "i" : "u"}${size}`),
  )
}

export const xU32 = _intNumber(false, 32);
