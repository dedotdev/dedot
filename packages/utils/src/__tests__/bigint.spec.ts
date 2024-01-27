import { describe, expect, it } from 'vitest';
import { max, min, nextPowerOfTwo, numOfTrailingZeroes } from '../bigint';

describe('bigint', () => {
  describe('max', () => {
    it('should return max value', () => {
      expect(max(100n, 20n)).toEqual(100n);
      expect(max(-100n, 20n)).toEqual(20n);
    });
  });
  describe('min', () => {
    it('should return min value', () => {
      expect(min(100n, 20n)).toEqual(20n);
      expect(min(-100n, 20n)).toEqual(-100n);
    });
  });
  describe('nextPowerOfTwo', () => {
    it('should return next power of two', () => {
      expect(nextPowerOfTwo(2n)).toEqual(2n);
      expect(nextPowerOfTwo(3n)).toEqual(4n);
      expect(nextPowerOfTwo(4n)).toEqual(4n);
      expect(nextPowerOfTwo(5n)).toEqual(8n);
      expect(nextPowerOfTwo(10n)).toEqual(16n);
      expect(nextPowerOfTwo(16n)).toEqual(16n);
      expect(nextPowerOfTwo(20n)).toEqual(32n);
    });
  });
  describe('numOfTrailingZeroes', () => {
    it('should return number of trailing zeros', () => {
      expect(numOfTrailingZeroes(1n)).toEqual(0n); // 0b1
      expect(numOfTrailingZeroes(2n)).toEqual(1n); // 0b10
      expect(numOfTrailingZeroes(3n)).toEqual(0n); // 0b11
      expect(numOfTrailingZeroes(4n)).toEqual(2n); // 0b100
      expect(numOfTrailingZeroes(10n)).toEqual(1n); // 0b1010
    });
  });
});
