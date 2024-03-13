// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Original implementation: https://github.com/polkadot-js/common/blob/22aab4a4e62944a2cf8c885f50be2c1b842813ec/packages/util-crypto/src/xxhash/asU8a.ts
import { HexString } from '../types.js';
import { u8aToHex, u8aToU8a } from '@polkadot/util';
import { xxhash64 } from './xxhash64.js';

export function xxhashAsU8a(
  data: string | Uint8Array,
  bitLength: 64 | 128 | 192 | 256 | 320 | 384 | 448 | 512 = 64,
): Uint8Array {
  const rounds = Math.ceil(bitLength / 64);
  const u8a = u8aToU8a(data);

  const result = new Uint8Array(rounds * 8);
  for (let seed = 0; seed < rounds; seed++) {
    result.set(xxhash64(u8a, seed).reverse(), seed * 8);
  }
  return result;
}

export function xxhashAsHex(
  data: string | Uint8Array,
  bitLength?: 256 | 512 | 64 | 128 | 384 | 320 | 192 | 448 | undefined,
): HexString {
  return u8aToHex(xxhashAsU8a(data, bitLength));
}
