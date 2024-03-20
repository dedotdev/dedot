import { describe, it, expect } from 'vitest';
import { numberToHex, numberToU8a } from '../number.js';

describe('number', () => {
  describe('numberToHex', () => {
    it('returns hex string for number input', () => {
      expect(numberToHex(4660)).toBe('0x1234');
    });

    it('returns hex string with leading zero for odd length', () => {
      expect(numberToHex(1)).toBe('0x01');
    });

    it('returns "0x00" for 0 input', () => {
      expect(numberToHex(0)).toBe('0x00');
    });

    it('returns "0x00" for null input', () => {
      // @ts-ignore
      expect(numberToHex(null)).toBe('0x00');
    });
  });

  describe('numberToU8a', () => {
    it('returns Uint8Array for number input', () => {
      expect(numberToU8a(4660)).toEqual(new Uint8Array([0x12, 0x34]));
    });

    it('returns Uint8Array with leading zero for odd length', () => {
      expect(numberToU8a(1)).toEqual(new Uint8Array([0x01]));
    });

    it('returns Uint8Array of "0x00" for 0 input', () => {
      expect(numberToU8a(0)).toEqual(new Uint8Array([0x00]));
    });

    it('returns Uint8Array of "0x00" for null input', () => {
      // @ts-ignore
      expect(numberToU8a(null)).toEqual(new Uint8Array([0x00]));
    });
  });
});
