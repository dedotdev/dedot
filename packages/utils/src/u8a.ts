import { HexString } from './types.js';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Convert a Uint8Array to a hex string
 */
export function u8aToHex(input?: Uint8Array | null, isPrefixed = true): HexString {
  const empty = isPrefixed ? '0x' : '';
  if (!input) return empty as HexString;

  return `${empty}${bytesToHex(input)}` as HexString;
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
