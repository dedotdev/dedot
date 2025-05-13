import { blake3 } from '@noble/hashes/blake3';
import { toU8a } from '../to.js';
import { HexString } from '../types.js';
import { u8aToHex } from '../u8a.js';

export function blake3AsU8a(
  data: string | Uint8Array,
  bitLength: 64 | 128 | 256 | 384 | 512 = 256,
  key?: Uint8Array | null,
): Uint8Array {
  const byteLength = Math.ceil(bitLength / 8);
  const u8a = toU8a(data);
  return key ? blake3(u8a, { dkLen: byteLength, key }) : blake3(u8a, { dkLen: byteLength });
}

export function blake3AsHex(
  data: string | Uint8Array,
  bitLength?: 256 | 512 | 64 | 128 | 384 | undefined,
  key?: Uint8Array | null | undefined,
): HexString {
  return u8aToHex(blake3AsU8a(data, bitLength, key));
}
