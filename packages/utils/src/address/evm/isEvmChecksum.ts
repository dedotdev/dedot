// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aToHex } from '../../u8a.js';

import { keccakAsU8a } from '../../hash/keccak.js';
import { hexStripPrefix } from '../../hex.js';

function isInvalidChar(char: string, byte: number): boolean {
  return char !== (byte > 7 ? char.toUpperCase() : char.toLowerCase());
}

export function isEvmChecksum(_address: string): boolean {
  const address = hexStripPrefix(_address);
  const hash = hexStripPrefix(u8aToHex(keccakAsU8a(address.toLowerCase())));

  for (let i = 0; i < 40; i++) {
    if (isInvalidChar(address[i], parseInt(hash[i], 16))) {
      return false;
    }
  }

  return true;
}
