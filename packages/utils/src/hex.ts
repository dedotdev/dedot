import { HexString } from './types.js';
import { hexToBytes } from '@noble/hashes/utils';
import { u8aToString } from './u8a.js';
import { isHex } from './is.js';

/**
 * Converts a hex string to a Uint8Array.
 *
 * @param {HexString | string} input - The hex string to be converted to a Uint8Array.
 * If the string starts with '0x', it will be removed before conversion.
 * @returns {Uint8Array} The Uint8Array representation of the hex string.
 */
export function hexToU8a(input: HexString | string): Uint8Array {
  return hexToBytes(input.startsWith('0x') ? input.substring(2) : input);
}

/**
 * Converts a hex string to a string.
 *
 * @param {HexString | string} input - The hex string to be converted to a string.
 * @returns {string} The string representation of the hex string.
 */
export function hexToString(input: HexString | string): string {
  return u8aToString(hexToU8a(input));
}

/**
 * Check if a hex is zero
 * - isZeroHash('0x000000') returns `true`
 * - isZeroHash('0x000001') returns `false`
 * @param input
 */
export const isZeroHex = (input: HexString): boolean => {
  return isHex(input) && hexToU8a(input).every((b) => b === 0);
};

// - TODO hexToNumber
// - TODO hexToBigInt
