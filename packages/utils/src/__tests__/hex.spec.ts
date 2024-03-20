import { describe, expect, it } from 'vitest';
import { HexString } from '../types.js';
import { hexToString, hexToU8a, isZeroHex } from '../hex.js';

describe('hex', () => {
  describe('hexToU8a', () => {
    it('returns Uint8Array for hex string input', () => {
      expect(hexToU8a('0x1234')).toEqual(new Uint8Array([0x12, 0x34]));
    });

    it('returns Uint8Array for hex string input without 0x prefix', () => {
      expect(hexToU8a('1234')).toEqual(new Uint8Array([0x12, 0x34]));
    });

    it('returns empty Uint8Array for empty string input', () => {
      expect(hexToU8a('')).toEqual(new Uint8Array([]));
    });
  });

  describe('hexToString', () => {
    it('returns string for hex string input', () => {
      expect(hexToString('0x616263')).toBe('abc');
    });

    it('returns string for hex string input without 0x prefix', () => {
      expect(hexToString('616263')).toBe('abc');
    });

    it('returns empty string for empty string input', () => {
      expect(hexToString('')).toBe('');
    });
  });

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
});
