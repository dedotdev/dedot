import { describe, it, expect } from 'vitest';
import { toHex, toU8a } from '../to.js';

describe('to', () => {
  describe('toHex', () => {
    it('returns hex string for Uint8Array input', () => {
      expect(toHex(new Uint8Array([0x12, 0x34]))).toBe('0x1234');
    });

    it('returns hex string for number input', () => {
      expect(toHex(4660)).toBe('0x1234');
    });

    it('returns the same hex string for hex string input', () => {
      expect(toHex('0x1234')).toBe('0x1234');
    });

    it('returns hex string for string input', () => {
      expect(toHex('abc')).toBe('0x616263');
    });

    it('throws error for invalid input', () => {
      // @ts-ignore
      expect(() => toHex({})).toThrow('Invalid input type of: [object Object]');
    });
  });

  describe('toU8a', () => {
    it('returns the same Uint8Array for Uint8Array input', () => {
      expect(toU8a(new Uint8Array([0x12, 0x34]))).toEqual(new Uint8Array([0x12, 0x34]));
    });

    it('returns Uint8Array for number input', () => {
      expect(toU8a(4660)).toEqual(new Uint8Array([0x12, 0x34]));
    });

    it('returns Uint8Array for hex string input', () => {
      expect(toU8a('0x1234')).toEqual(new Uint8Array([0x12, 0x34]));
    });

    it('returns Uint8Array for string input', () => {
      expect(toU8a('abc')).toEqual(new Uint8Array([0x61, 0x62, 0x63]));
    });

    it('returns Uint8Array for Array<number> input', () => {
      expect(toU8a([0x12, 0x34])).toEqual(new Uint8Array([0x12, 0x34]));
      expect(toU8a([1, 2, 3])).toEqual(new Uint8Array([1, 2, 3]));
      expect(toU8a([])).toEqual(new Uint8Array([]));
    });

    it('throws error for invalid input', () => {
      // @ts-ignore
      expect(() => toU8a({})).toThrow('Invalid input type of: [object Object]');
    });
  });
});
