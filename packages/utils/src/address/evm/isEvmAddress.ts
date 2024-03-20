// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isHex } from '../../is.js';

import { isEvmChecksum } from './isEvmChecksum.js';

export const EVM_ADDRESS_REGEX = /^(0x)?[a-fA-F0-9]{40}$/;

export function isEvmAddress(address?: string): boolean {
  if (!address || address.length !== 42 || !isHex(address)) {
    return false;
  } else if (EVM_ADDRESS_REGEX.test(address)) {
    return true;
  }

  return isEvmChecksum(address);
}
