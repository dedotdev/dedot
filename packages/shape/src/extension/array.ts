import { array as originalArray, Shape } from '../subshape.js';

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

  shaped.registerDecoder(shouldDecodeArray, decodeArray);

  return shaped;
}
