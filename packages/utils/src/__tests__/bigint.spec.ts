import { describe, expect, it } from 'vitest';
import { bnAbs, bnMax, bnMin, bnToHex, bnToU8a } from '../bigint.js';

describe('bigint', () => {
  describe('bnMax', () => {
    it('should return max value', () => {
      expect(bnMax(100n, 20n)).toEqual(100n);
      expect(bnMax(-100n, 20n)).toEqual(20n);
    });
  });
  describe('bnMin', () => {
    it('should return min value', () => {
      expect(bnMin(100n, 20n)).toEqual(20n);
      expect(bnMin(-100n, 20n)).toEqual(-100n);
    });
  });
  describe('bnToHex', () => {
    it('should convert to hex', () => {
      expect(bnToHex(100n)).toEqual('0x64');
      expect(bnToHex(12345n)).toEqual('0x3039');
      expect(bnToHex(123456789n)).toEqual('0x075bcd15');
    });
  });
  describe('bnAbs', () => {
    it('should return positive value', () => {
      expect(bnAbs(100n)).toEqual(100n);
      expect(bnAbs(-100n)).toEqual(100n);
    });
  });
  describe('bnToU8a', () => {
    it('should convert positive bigint to Uint8Array', () => {
      expect(bnToU8a(123456789n)).toEqual(new Uint8Array([0x07, 0x5b, 0xcd, 0x15]));
    });

    it('should convert zero bigint to Uint8Array', () => {
      expect(bnToU8a(0n)).toEqual(new Uint8Array([0x00]));
    });

    it('should convert negative bigint to Uint8Array', () => {
      expect(bnToU8a(-123456789n)).toEqual(new Uint8Array([0x07, 0x5b, 0xcd, 0x15]));
    });

    it('should convert maximum safe bigint to Uint8Array', () => {
      expect(bnToU8a(BigInt(Number.MAX_SAFE_INTEGER))).toEqual(
        new Uint8Array([0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
      );
    });

    it('should convert minimum safe bigint to Uint8Array', () => {
      expect(bnToU8a(BigInt(Number.MIN_SAFE_INTEGER))).toEqual(
        new Uint8Array([0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
      );
    });
  });
});
