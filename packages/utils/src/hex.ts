import { hexToBytes } from '@noble/hashes/utils';
import { isHex } from './is.js';
import { HexString } from './types.js';
import { u8aToString } from './u8a.js';

/**
 * Converts a hex string to a Uint8Array.
 *
 * @param {HexString | string} input - The hex string to be converted to a Uint8Array.
 * If the string starts with '0x', it will be removed before conversion.
 * @returns {Uint8Array} The Uint8Array representation of the hex string.
 */
export function hexToU8a(input: HexString | string): Uint8Array {
  return hexToBytes(hexStripPrefix(input));
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
 *
 * @param input {HexString}
 */
export const isZeroHex = (input: HexString): boolean => {
  return isHex(input) && hexToU8a(input).every((b) => b === 0);
};

/**
 * Add '0x' prefix to a hex string if it doesn't have one
 *
 * @param input {HexString}
 */
export const hexAddPrefix = (input?: HexString | string): HexString => {
  if (!input) return '0x';

  return (input.startsWith('0x') ? input : `0x${input}`) as HexString;
};

/**
 * Remove '0x' prefix from a hex string if it has one
 *
 * @param input {HexString}
 */
export const hexStripPrefix = (input?: HexString | string): string => {
  if (!input) return '';

  return input.startsWith('0x') ? input.substring(2) : input;
};

/**
 * Convert a hex string to a number
 *
 * @param input
 */
export const hexToNumber = (input?: HexString | string): number => {
  const stripped = hexStripPrefix(input);
  return stripped ? parseInt(stripped, 16) : 0;
};

/**
 * Convert a hex string to a bigint
 *
 * @param input
 */
export const hexToBn = (input?: HexString | string): bigint => {
  const stripped = hexStripPrefix(input);
  return stripped ? BigInt(`0x${stripped}`) : 0n;
};

/**
 * Generate a random hex string of provided bytes size
 *
 * @param bytes number of bytes to generate (default: 32 bytes)
 */
export const generateRandomHex = (bytes: number = 32): HexString => {
  return `0x${[...Array<string>(bytes * 2)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
};
