import { option as originalOption, Shape } from 'subshape';
import { isHex, isNull, isU8a, isUndefined } from '@polkadot/util';

function shouldDecodeInner(input: any) {
  return !(isHex(input) || isU8a(input));
}

function decodeInner($shape: Shape<any>, input: any) {
  // @ts-ignore
  const $some = $shape.metadata[0].args[0];
  return $some.tryDecode(input);
}

export function option<SI, SO>($some: Shape<SI, SO>): Shape<SI | undefined, SO | undefined> {
  const shaped = originalOption($some);

  shaped.registerDecoder(isUndefined, (_, input) => undefined);
  shaped.registerDecoder(isNull, (_, input) => undefined);
  shaped.registerDecoder(shouldDecodeInner, decodeInner);

  return shaped;
}
