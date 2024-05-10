import { bytesToHex } from '@noble/hashes/utils';
import { hexAddPrefix } from './hex.js';
import { HexString } from './types.js';

/**
 * Convert a Uint8Array to a hex string
 */
export function u8aToHex(input?: Uint8Array | null): HexString {
  if (!input) return '0x';

  return hexAddPrefix(bytesToHex(input));
}

const textDecoder = new TextDecoder('utf-8');

/**
 * Convert a Uint8Array to a string
 */
export function u8aToString(input?: Uint8Array | null): string {
  if (!input) return '';

  return textDecoder.decode(input);
}

// - TODO u8aToNumber
// - TODO u8aToBigInt

/**
 * Compare two Uint8Arrays for equality
 */
export function u8aEq(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((byte, index) => b[index] === byte);
}
