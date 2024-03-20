// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Original implementation: https://github.com/polkadot-js/common/blob/22aab4a4e62944a2cf8c885f50be2c1b842813ec/packages/util-crypto/src/blake2/asU8a.ts
import { blake2b } from '@noble/hashes/blake2b';
import { u8aToHex } from '../u8a.js';
import { HexString } from '../types.js';
import { toU8a } from '../to.js';

export function blake2AsU8a(
  data: string | Uint8Array,
  bitLength: 64 | 128 | 256 | 384 | 512 = 256,
  key?: Uint8Array | null,
): Uint8Array {
  const byteLength = Math.ceil(bitLength / 8);
  const u8a = toU8a(data);
  return key ? blake2b(u8a, { dkLen: byteLength, key }) : blake2b(u8a, { dkLen: byteLength });
}

export function blake2AsHex(
  data: string | Uint8Array,
  bitLength?: 256 | 512 | 64 | 128 | 384 | undefined,
  key?: Uint8Array | null | undefined,
): HexString {
  return u8aToHex(blake2AsU8a(data, bitLength, key));
}
