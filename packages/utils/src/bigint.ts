import { hexToU8a } from './hex.js';
import { HexString } from './types.js';

/**
 * Return the bigger bigint value
 */
export function bnMax(a: bigint, b: bigint) {
  return a > b ? a : b;
}

/**
 * Return the smaller bigint value
 */
export function bnMin(a: bigint, b: bigint) {
  return a > b ? b : a;
}

/**
 * Return the absolute value of a bigint
 */
export function bnAbs(n: bigint) {
  return n < 0n ? -n : n;
}

/**
 * Convert bigint to hex
 */
export function bnToHex(n: bigint): HexString {
  const hex = bnAbs(n).toString(16);
  return `0x${hex.length % 2 ? `0${hex}` : hex}`;
}

/**
 * Convert bigint to Uint8Array
 */
export function bnToU8a(n: bigint): Uint8Array {
  return hexToU8a(bnToHex(n));
}
