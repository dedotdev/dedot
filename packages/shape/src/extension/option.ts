import { isHex, isNull, isU8a, isUndefined } from '@dedot/utils';
import { option as originalOption, Shape } from '../deshape.js';

function shouldDecodeInner(input: any) {
  return !(isHex(input) || isU8a(input));
}

function isNone(input: any) {
  return isUndefined(input) || isNull(input) || input === '0x';
}

function decodeInner($shape: Shape<any>, input: any) {
  // @ts-ignore
  const $some = $shape.metadata[0].args[0];
  return $some.tryDecode(input);
}

export function option<SI, SO>($some: Shape<SI, SO>): Shape<SI | undefined, SO | undefined> {
  const shaped = originalOption($some);

  shaped.registerDecoder(isNone, (_, input) => undefined);
  shaped.registerDecoder(shouldDecodeInner, decodeInner);

  return shaped;
}

export const Option = option;
