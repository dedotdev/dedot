import { describe, expect, it } from 'vitest';
import { bnMax, bnMin, bnToHex } from '../bigint.js';

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
    });
  });
});
