// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Original implementation: https://github.com/paritytech/polka-ui/blob/4858c094684769080f5811f32b081dd7780b0880/src/polkadot.js#L34

import { concatU8a } from '../../concat';

import { decodeAddress } from './decodeAddress.js';
import { sshash } from './sshash.js';
import { base58 } from '@scure/base';

export const DEFAULT_SUBSTRATE_ADDRESS_PREFIX: number = 42;
export const ALLOWED_DECODED_LENGTHS: number[] = [1, 2, 4, 8, 32, 33];

export function encodeAddress(key: string | Uint8Array, ss58Format: number = DEFAULT_SUBSTRATE_ADDRESS_PREFIX): string {
  // decode it, this means we can re-encode an address
  const u8a = decodeAddress(key);

  if (ss58Format < 0 || ss58Format > 16383 || [46, 47].includes(ss58Format)) {
    throw new Error('Out of range ss58Format specified');
  } else if (!ALLOWED_DECODED_LENGTHS.includes(u8a.length)) {
    throw new Error(`Expected a valid key to convert, with length ${ALLOWED_DECODED_LENGTHS.join(', ')}`);
  }

  const input = concatU8a(
    ss58Format < 64
      ? Uint8Array.from([ss58Format])
      : Uint8Array.from([
          ((ss58Format & 0b0000_0000_1111_1100) >> 2) | 0b0100_0000,
          (ss58Format >> 8) | ((ss58Format & 0b0000_0000_0000_0011) << 6),
        ]),
    u8a,
  );

  return base58.encode(concatU8a(input, sshash(input).subarray(0, [32, 33].includes(u8a.length) ? 2 : 1)));
}
