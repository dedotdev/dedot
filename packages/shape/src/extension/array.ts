import { array as originalArray, DecodeBuffer, Shape } from '../deshape.js';
import { decodeElements } from './bounds.js';
import { compactU32 } from './compact.js';

function shouldDecodeArray(input: any) {
  return Array.isArray(input);
}

function decodeArray($shape: Shape<any>, input: Array<any>) {
  const { args } = $shape.metadata[0];

  const $innerShape = args![0];

  return input.map((inner) => $innerShape.tryDecode(inner));
}

export function array<I, O = I>($el: Shape<I, O>): Shape<I[], O[]> {
  const shaped = originalArray($el);

  // The length prefix comes from the input, so we validate it against the input
  // before allocating & decoding the elements, instead of trusting it blindly
  shaped.subDecode = function (buffer: DecodeBuffer): O[] {
    const length = compactU32.subDecode(buffer);

    return decodeElements(this, $el, buffer, length);
  };

  shaped.registerDecoder(shouldDecodeArray, decodeArray);

  return shaped;
}
