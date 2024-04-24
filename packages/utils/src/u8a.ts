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
 * @Ref: https://github.com/polkadot-js/common/blob/master/packages/util/src/u8a/eq.ts
 */
export function u8aEq(a: Uint8Array, b: Uint8Array) {
  if (a.length === b.length) {
    const dvA = new DataView(a.buffer, a.byteOffset);
    const dvB = new DataView(b.buffer, b.byteOffset);
    const mod = a.length % 4 | 0;
    const length = (a.length - mod) | 0;
    for (let i = 0; i < length; i += 4) {
      if (dvA.getUint32(i) !== dvB.getUint32(i)) {
        return false;
      }
    }
    for (let i = length, count = a.length; i < count; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  return false;
}
