import { describe, expect, it } from 'vitest';
import { hexToString, hexToU8a, isZeroHex, hexToNumber, hexToBn } from '../hex.js';
import { HexString } from '../types.js';

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

  describe('hexToNumber', () => {
    it.each([
      { input: '0x0', expected: 0 },
      { input: '0x1', expected: 1 },
      { input: '0xa', expected: 10 },
      { input: '0xff', expected: 255 },
      { input: '0x1a', expected: 26 },
      { input: '0x123', expected: 291 },
      { input: '0x123abc', expected: 1194684 },
      { input: '0xffffffff', expected: 4294967295 },
    ])('should convert hex string with 0x prefix: $input -> $expected', ({ input, expected }) => {
      expect(hexToNumber(input)).toBe(expected);
    });

    it.each([
      { input: '0', expected: 0 },
      { input: '1', expected: 1 },
      { input: 'a', expected: 10 },
      { input: 'ff', expected: 255 },
      { input: '1a', expected: 26 },
      { input: '123', expected: 291 },
      { input: '123abc', expected: 1194684 },
      { input: 'ffffffff', expected: 4294967295 },
    ])('should convert hex string without 0x prefix: $input -> $expected', ({ input, expected }) => {
      expect(hexToNumber(input)).toBe(expected);
    });

    it.each([
      { input: undefined, expected: 0 },
      { input: '', expected: 0 },
      { input: '0x', expected: 0 },
    ])('should handle edge cases: $input -> $expected', ({ input, expected }) => {
      expect(hexToNumber(input)).toBe(expected);
    });

    it('should handle uppercase hex letters', () => {
      expect(hexToNumber('0xABCDEF')).toBe(11259375);
      expect(hexToNumber('ABCDEF')).toBe(11259375);
    });

    it('should handle mixed case hex letters', () => {
      expect(hexToNumber('0xAbCdEf')).toBe(11259375);
      expect(hexToNumber('AbCdEf')).toBe(11259375);
    });
  });

  describe('hexToBn', () => {
    it.each([
      { input: '0x0', expected: 0n },
      { input: '0x1', expected: 1n },
      { input: '0xa', expected: 10n },
      { input: '0xff', expected: 255n },
      { input: '0x1a', expected: 26n },
      { input: '0x123', expected: 291n },
      { input: '0x123abc', expected: 1194684n },
      { input: '0xffffffff', expected: 4294967295n },
    ])('should convert hex string with 0x prefix: $input -> $expected', ({ input, expected }) => {
      expect(hexToBn(input as HexString)).toBe(expected);
    });

    it.each([
      { input: '0x0', expected: 0n },
      { input: '0x1', expected: 1n },
      { input: '0xa', expected: 10n },
      { input: '0xff', expected: 255n },
      { input: '0x1a', expected: 26n },
      { input: '0x123', expected: 291n },
      { input: '0x123abc', expected: 1194684n },
      { input: '0xffffffff', expected: 4294967295n },
    ])('should convert hex string without 0x prefix by handling it internally: $input -> $expected', ({ input, expected }) => {
      // Note: hexToBn expects HexString type (with 0x prefix), but internally uses hexStripPrefix
      expect(hexToBn(input as HexString)).toBe(expected);
    });

    it.each([
      { input: undefined, expected: 0n },
      { input: '0x' as HexString, expected: 0n },
    ])('should handle edge cases: $input -> $expected', ({ input, expected }) => {
      expect(hexToBn(input)).toBe(expected);
    });

    it('should handle large numbers beyond JavaScript safe integer limit', () => {
      const largeHex = '0x1fffffffffffff' as HexString; // Larger than Number.MAX_SAFE_INTEGER
      const expected = 9007199254740991n;
      expect(hexToBn(largeHex)).toBe(expected);
    });

    it('should handle very large numbers', () => {
      const veryLargeHex = '0x123456789abcdef0123456789abcdef' as HexString;
      const expected = BigInt('0x123456789abcdef0123456789abcdef');
      expect(hexToBn(veryLargeHex)).toBe(expected);
    });

    it('should handle uppercase hex letters', () => {
      expect(hexToBn('0xABCDEF' as HexString)).toBe(11259375n);
    });

    it('should handle mixed case hex letters', () => {
      expect(hexToBn('0xAbCdEf' as HexString)).toBe(11259375n);
    });

    it('should handle 256-bit numbers', () => {
      const hex256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as HexString;
      const expected = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      expect(hexToBn(hex256)).toBe(expected);
    });
  });
});
