// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { isEvmChecksum } from '../isEvmChecksum.js';

const ADDRESS = '0x00a329c0648769A73afAc7F9381E08FB43dBEA72';

describe('isEvmChecksum', () => {
  it('returns false on invalid address', () => {
    expect(isEvmChecksum('0x00a329c0648769')).toBe(false);
  });

  it('returns false on non-checksum address', () => {
    expect(isEvmChecksum('0x1234567890abcdeedcba1234567890abcdeedcba')).toBe(false);
  });

  it('returns false when fully lowercase', () => {
    expect(isEvmChecksum(ADDRESS.toLowerCase())).toBe(false);
  });

  it('returns false when fully uppercase', () => {
    expect(isEvmChecksum(ADDRESS.toUpperCase().replace('0X', '0x'))).toBe(false);
  });

  it('returns true on a checksummed address', () => {
    expect(isEvmChecksum(ADDRESS)).toBe(true);
  });
});
