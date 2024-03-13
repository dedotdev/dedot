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
 * Convert bigint to hex
 * @param n
 */
export function bnToHex(n: bigint): HexString {
  return `0x${n.toString(16)}`;
}
