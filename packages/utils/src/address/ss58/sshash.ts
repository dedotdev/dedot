// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { stringToU8a, u8aConcat } from '@polkadot/util';
import { blake2AsU8a } from '../../hash/blake2.js';

const SS58_PREFIX = stringToU8a('SS58PRE');

export function sshash(key: Uint8Array): Uint8Array {
  return blake2AsU8a(u8aConcat(SS58_PREFIX, key), 512);
}
