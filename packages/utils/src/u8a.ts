import { HexString } from './types.js';
import { bytesToHex } from '@noble/hashes/utils';

export function u8aToHex(input: Uint8Array, isPrefixed = true): HexString {
  return `${isPrefixed ? '0x' : ''}${bytesToHex(input)}` as HexString;
}

const textDecoder = new TextDecoder('utf-8');
export function u8aToString(input: Uint8Array): string {
  return textDecoder.decode(input);
}

// - TODO u8aToNumber
// - TODO u8aToBigInt
