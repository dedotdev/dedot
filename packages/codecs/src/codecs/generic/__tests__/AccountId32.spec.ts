import { encodeAddress } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { AccountId32 } from '../AccountId32.js';

describe('AccountId32', () => {
  describe('eq', () => {
    it('should return true for equal AccountId32 instances', () => {
      const accountId1 = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      const accountId2 = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      expect(accountId1.eq(accountId2)).toBe(true);
    });

    it('should return false for different AccountId32 instances', () => {
      const accountId1 = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      const accountId2 = new AccountId32('5GpTe4rrVUcZbndCc6HGNCLNfs84R9xaQ9FhPYXQFUZqMVZn');
      expect(accountId1.eq(accountId2)).toBe(false);
    });

    it('should return true for equal AccountId32 instances represented as strings', () => {
      const accountId1 = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      const accountId2 = '5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg';
      expect(accountId1.eq(accountId2)).toBe(true);
    });

    it('should return true for equal AccountId32 instances represented as strings in different prefix format', () => {
      const accountId1 = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      const accountId2 = encodeAddress('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg', 0);
      expect(accountId1.eq(accountId2)).toBe(true);
    });

    it('should return false for different AccountId32 instances represented as strings', () => {
      const accountId1 = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      const accountId2 = '5GpTe4rrVUcZbndCc6HGNCLNfs84R9xaQ9FhPYXQFUZqMVZn';
      expect(accountId1.eq(accountId2)).toBe(false);
    });
  });

  describe('isZero', () => {
    it('should return true for zero AccountId32', () => {
      const zeroAccountId = new AccountId32('0x');
      expect(zeroAccountId.isZero()).toBe(true);
    });

    it('should return false for non-zero AccountId32', () => {
      const nonZeroAccountId = new AccountId32('5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg');
      expect(nonZeroAccountId.isZero()).toBe(false);
    });
  });
});
