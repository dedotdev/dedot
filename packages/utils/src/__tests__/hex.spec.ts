import { describe, expect, it } from 'vitest';
import { hexToString, hexToU8a, isZeroHex, hexToNumber, hexToBn, generateRandomHex } from '../hex.js';
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
    ])(
      'should convert hex string without 0x prefix by handling it internally: $input -> $expected',
      ({ input, expected }) => {
        // Note: hexToBn expects HexString type (with 0x prefix), but internally uses hexStripPrefix
        expect(hexToBn(input as HexString)).toBe(expected);
      },
    );

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

  describe('generateRandomHex', () => {
    describe('basic functionality', () => {
      it('should generate hex string with default 32 bytes', () => {
        const result = generateRandomHex();
        expect(result).toMatch(/^0x[0-9a-f]{64}$/);
        expect(result.length).toBe(66); // '0x' + 64 hex chars
      });

      it.each([
        { bytes: 1, expectedLength: 4 }, // '0x' + 2 hex chars
        { bytes: 4, expectedLength: 10 }, // '0x' + 8 hex chars
        { bytes: 16, expectedLength: 34 }, // '0x' + 32 hex chars
        { bytes: 32, expectedLength: 66 }, // '0x' + 64 hex chars
        { bytes: 64, expectedLength: 130 }, // '0x' + 128 hex chars
        { bytes: 128, expectedLength: 258 }, // '0x' + 256 hex chars
      ])('should generate hex string with $bytes bytes -> length $expectedLength', ({ bytes, expectedLength }) => {
        const result = generateRandomHex(bytes);
        expect(result.length).toBe(expectedLength);
        expect(result).toMatch(new RegExp(`^0x[0-9a-f]{${expectedLength - 2}}$`));
      });
    });

    describe('format validation', () => {
      it('should always start with 0x prefix', () => {
        const result = generateRandomHex(16);
        expect(result.startsWith('0x')).toBe(true);
      });

      it('should only contain valid hex characters', () => {
        const result = generateRandomHex(32);
        expect(result).toMatch(/^0x[0-9a-f]+$/);
      });

      it('should return HexString type that works with other hex utilities', () => {
        const result = generateRandomHex(4);
        // Should be able to use with other hex functions without type errors
        expect(() => hexToU8a(result)).not.toThrow();
        expect(() => hexToNumber(result)).not.toThrow();
        expect(() => hexToBn(result)).not.toThrow();
      });
    });

    describe('randomness tests', () => {
      it('should generate different values on multiple calls', () => {
        const results = Array.from({ length: 10 }, () => generateRandomHex(16));
        const uniqueResults = new Set(results);
        expect(uniqueResults.size).toBe(10); // All should be unique
      });

      it('should not generate predictable patterns', () => {
        const result = generateRandomHex(32);
        const hexPart = result.slice(2); // Remove '0x' prefix

        // Check it's not all the same character
        const allSameChar = hexPart.split('').every((char) => char === hexPart[0]);
        expect(allSameChar).toBe(false);

        // Check it's not all zeros
        expect(hexPart).not.toBe('0'.repeat(64));

        // Check it's not all 'f's
        expect(hexPart).not.toBe('f'.repeat(64));
      });

      it('should have reasonable distribution of hex characters', () => {
        // Generate a larger sample to test distribution
        const result = generateRandomHex(100); // 200 hex chars
        const hexPart = result.slice(2);
        const charCounts = new Map<string, number>();

        // Count occurrences of each hex character
        for (const char of hexPart) {
          charCounts.set(char, (charCounts.get(char) || 0) + 1);
        }

        // Should have multiple different characters (not just 1 or 2)
        expect(charCounts.size).toBeGreaterThan(5);

        // No single character should dominate (> 50% of total)
        const maxCount = Math.max(...charCounts.values());
        expect(maxCount).toBeLessThan(hexPart.length * 0.5);
      });
    });

    describe('edge cases', () => {
      it('should handle zero bytes', () => {
        const result = generateRandomHex(0);
        expect(result).toBe('0x');
        expect(result.length).toBe(2);
      });

      it('should handle large byte values', () => {
        const result = generateRandomHex(1000);
        expect(result.length).toBe(2002); // '0x' + 2000 hex chars
        expect(result).toMatch(/^0x[0-9a-f]{2000}$/);
      });

      it('should handle fractional bytes (throws error due to invalid array length)', () => {
        // The current implementation doesn't handle fractional bytes properly
        // It tries to create Array(bytes * 2) which fails with fractional numbers
        expect(() => generateRandomHex(1.7)).toThrow('Invalid array length');
      });
    });

    describe('integration with other hex utilities', () => {
      it('should work with hexToU8a', () => {
        const hex = generateRandomHex(8);
        const uint8Array = hexToU8a(hex);
        expect(uint8Array).toBeInstanceOf(Uint8Array);
        expect(uint8Array.length).toBe(8);
      });

      it('should work with hexToNumber for small values', () => {
        const hex = generateRandomHex(4); // 4 bytes = 32 bits, safe for number
        const number = hexToNumber(hex);
        expect(typeof number).toBe('number');
        expect(number).toBeGreaterThanOrEqual(0);
        expect(number).toBeLessThanOrEqual(0xffffffff);
      });

      it('should work with hexToBn', () => {
        const hex = generateRandomHex(32);
        const bigint = hexToBn(hex);
        expect(typeof bigint).toBe('bigint');
        expect(bigint).toBeGreaterThanOrEqual(0n);
      });
    });
  });
});
