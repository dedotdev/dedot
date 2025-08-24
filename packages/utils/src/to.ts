import { hexToU8a } from './hex.js';
import { isHex, isNumber, isNumberArray, isString, isU8a } from './is.js';
import { numberToHex, numberToU8a } from './number.js';
import { stringToHex, stringToU8a } from './string/index.js';
import { HexString } from './types.js';
import { u8aToHex } from './u8a.js';

/**
 * Converts the input to a hex string.
 *
 * @param {string | number | Uint8Array | HexString} input - The input to be converted to a hex string.
 * This can be a string, number, Uint8Array, or a hex string.
 * @returns {HexString} The hex string representation of the input.
 * @throws {Error} Throws an error if the input type is not string, number, Uint8Array, or hex string.
 */
export function toHex(input: string | number | Uint8Array | HexString): HexString {
  if (isU8a(input)) {
    return u8aToHex(input);
  } else if (isNumber(input)) {
    return numberToHex(input);
  } else if (isHex(input)) {
    return input;
  } else if (isString(input)) {
    return stringToHex(input);
  }

  throw new Error(`Invalid input type of: ${input}`);
}

/**
 * Converts the input to a Uint8Array.
 *
 * @param {string | number | Uint8Array | HexString | Array<number>} input - The input to be converted to a Uint8Array.
 * This can be a string, number, Uint8Array, hex string, or array of numbers.
 * @returns {Uint8Array} The Uint8Array representation of the input.
 * @throws {Error} Throws an error if the input type is not string, number, Uint8Array, hex string, or array of numbers.
 */
export function toU8a(input: string | number | Uint8Array | HexString | Array<number>): Uint8Array {
  if (isU8a(input)) {
    return input;
  } else if (isNumberArray(input)) {
    return new Uint8Array(input);
  } else if (isNumber(input)) {
    return numberToU8a(input);
  } else if (isHex(input)) {
    return hexToU8a(input);
  } else if (isString(input)) {
    return stringToU8a(input);
  }

  throw new Error(`Invalid input type of: ${input}`);
}
