import { HexString } from './types.js';
import { hexToBytes } from '@noble/hashes/utils';
import { u8aToString } from './u8a.js';
import { isHex } from './is.js';

export function hexToU8a(input: HexString | string): Uint8Array {
  return hexToBytes(input.startsWith('0x') ? input.substring(2) : input);
}

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
