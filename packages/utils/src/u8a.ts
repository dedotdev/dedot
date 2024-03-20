import { bytesToHex } from '@noble/hashes/utils';
import { HexString } from './types.js';
import { hexAddPrefix } from './hex.js';

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
