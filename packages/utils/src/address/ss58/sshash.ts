// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { concatU8a } from '../../concat.js';
import { blake2AsU8a } from '../../hash/blake2.js';
import { stringToU8a } from '../../string/index.js';

const SS58_PREFIX = stringToU8a('SS58PRE');

export function sshash(key: Uint8Array): Uint8Array {
  return blake2AsU8a(concatU8a(SS58_PREFIX, key), 512);
}
