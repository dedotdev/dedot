// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { isEvmAddress } from '../isEvmAddress.js';

const ADDRESS = '0x00a329c0648769A73afAc7F9381E08FB43dBEA72';

describe('isEvmAddress', () => {
  it('returns true when fully lowercase', () => {
    expect(isEvmAddress(ADDRESS.toLowerCase())).toBe(true);
  });

  it('returns true when fully uppercase', () => {
    expect(isEvmAddress(ADDRESS.toUpperCase().replace('0X', '0x'))).toBe(true);
  });

  it('returns true when checksummed', () => {
    expect(isEvmAddress(ADDRESS)).toBe(true);
  });

  it('returns false when empty address', () => {
    expect(isEvmAddress()).toBe(false);
  });

  it('returns false when invalid address', () => {
    expect(isEvmAddress('0xinvalid')).toBe(false);
  });

  it('returns false when invalid address of correct length', () => {
    expect(isEvmAddress('0xinvalid000123456789012345678901234567890')).toBe(false);
  });
});
