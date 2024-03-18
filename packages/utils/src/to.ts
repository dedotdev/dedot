import { HexString } from './types.js';
import { isHex, isNumber, isString, isU8a } from './is.js';
import { numberToHex, numberToU8a } from './number.js';
import { stringToHex, stringToU8a } from './string/index.js';
import { u8aToHex } from './u8a.js';
import { hexToU8a } from './hex.js';

export function toHex(input: string | number | Uint8Array | HexString): HexString {
  if (isHex(input)) {
    return input;
  } else if (isString(input)) {
    return stringToHex(input);
  } else if (isU8a(input)) {
    return u8aToHex(input);
  } else if (isNumber(input)) {
    return numberToHex(input);
  }

  throw new Error(`Invalid input type of: ${input}`);
}

export function toU8a(input: string | number | Uint8Array | HexString): Uint8Array {
  if (isHex(input)) {
    return hexToU8a(input);
  } else if (isString(input)) {
    return stringToU8a(input);
  } else if (isU8a(input)) {
    return input;
  } else if (isNumber(input)) {
    return numberToU8a(input);
  } else throw new Error(`Invalid input type of: ${input}`);
}
