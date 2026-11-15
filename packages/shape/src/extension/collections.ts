import { DecodeBuffer, map as originalMap, set as originalSet, Shape, ShapeMap, ShapeSet, tuple } from '../deshape.js';
import { decodeElements } from './bounds.js';
import { compactU32 } from './compact.js';

export const map: typeof originalMap = ($key: Shape<any>, $value: Shape<any>) => {
  const shaped = originalMap($key, $value);
  const $entry = tuple($key, $value);

  // The length prefix comes from the input, validate it before decoding the entries
  shaped.subDecode = function (buffer: DecodeBuffer) {
    const length = compactU32.subDecode(buffer);

    return new ShapeMap($key, decodeElements(this, $entry, buffer, length));
  };

  return shaped;
};

export const set: typeof originalSet = ($value: Shape<any>) => {
  const shaped = originalSet($value);

  // The length prefix comes from the input, validate it before decoding the values
  shaped.subDecode = function (buffer: DecodeBuffer) {
    const length = compactU32.subDecode(buffer);

    return new ShapeSet($value, decodeElements(this, $value, buffer, length));
  };

  return shaped;
};
