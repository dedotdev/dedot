// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Original implementation: https://github.com/polkadot-js/common/blob/22aab4a4e62944a2cf8c885f50be2c1b842813ec/packages/util-crypto/src/keccak/asU8a.ts
import { keccak_256 as keccak256, keccak_512 as keccak512 } from '@noble/hashes/sha3';
import { toU8a } from '../to.js';
import { HexString } from '../types.js';
import { u8aToHex } from '../u8a.js';

export function keccakAsU8a(data: string | Uint8Array, bitLength: 256 | 512 = 256): Uint8Array {
  const u8a = toU8a(data);

  if (bitLength === 256) {
    return keccak256(u8a);
  } else if (bitLength === 512) {
    return keccak512(u8a);
  }

  throw new Error('Invalid bitLength, only support 256 or 512!');
}

export function keccakAsHex(data: string | Uint8Array, bitLength?: 256 | 512): HexString {
  return u8aToHex(keccakAsU8a(data, bitLength));
}
