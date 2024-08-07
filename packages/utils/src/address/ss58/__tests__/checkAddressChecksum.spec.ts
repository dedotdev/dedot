// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { base58 } from '@scure/base';
import { describe, it, expect } from 'vitest';
import { checkAddressChecksum } from '../checkAddressChecksum.js';

describe('checkAddressChecksum', (): void => {
  it('correctly extracts the info from a 1-byte-prefix address', (): void => {
    expect(checkAddressChecksum(base58.decode('F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29'))).toEqual([
      true,
      33,
      1,
      2,
    ]);
  });

  it('correctly extracts the info from a 2-byte-prefix address (66)', (): void => {
    expect(checkAddressChecksum(base58.decode('cTGShekJ1L1UKFZR9xmv9UTJod7vqjFAPo4sDhXih2c3y1yLS'))).toEqual([
      true,
      34,
      2,
      66,
    ]);
  });

  it('correctly extracts the info from a 2-byte-prefix address (69)', (): void => {
    expect(checkAddressChecksum(base58.decode('cnVvyMzRdqjwejTFuByQQ4w2yu78V2hpFixjHQz5zr6NSYsxA'))).toEqual([
      true,
      34,
      2,
      69,
    ]);
  });

  it('correctly extracts the info from a 2-byte-prefix address (252)', (): void => {
    expect(checkAddressChecksum(base58.decode('xw8Ffc2SZtDqUJKd9Ky4vc7PRz2D2asuVkEEzf3WGAbw9cnfq'))).toEqual([
      true,
      34,
      2,
      252,
    ]);
  });

  it('correctly extracts the info from a 2-byte-prefix address (255)', (): void => {
    expect(checkAddressChecksum(base58.decode('yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k'))).toEqual([
      true,
      34,
      2,
      255,
    ]);
  });

  it('correctly extracts the info from a 2-byte-prefix address (ecdsa, from Substrate)', (): void => {
    expect(checkAddressChecksum(base58.decode('4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV'))).toEqual([
      true,
      35,
      2,
      200,
    ]);
  });
});
