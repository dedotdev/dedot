import { describe, expect, it } from 'vitest';
import { HexString } from '../types.js';
import { isZeroHex } from '../hex.js';

describe('isZeroHex', () => {
  it.each([
    { input: '0x00000000', expected: true },
    { input: '0x00', expected: true },
    { input: '0x', expected: true },
    { input: '0x00000001', expected: false },
    { input: '0x11223344', expected: false },
  ])('should check zero hex for $input', ({ input, expected }) => {
    expect(isZeroHex(input as HexString)).toEqual(expected);
  });
});
