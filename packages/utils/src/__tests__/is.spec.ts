import { describe, it, expect } from 'vitest';
import {
  isBigInt,
  isBoolean,
  isFunction,
  isHex,
  isNull,
  isNumber,
  isObject,
  isString,
  isU8a,
  isUndefined,
} from '../is.js';

describe('is', () => {
  describe('isNull', () => {
    it('returns true for null input', () => {
      expect(isNull(null)).toBe(true);
    });

    it('returns false for non-null input', () => {
      expect(isNull('not null')).toBe(false);
      expect(isNull(undefined)).toBe(false);
    });
  });

  describe('isUndefined', () => {
    it('returns true for undefined input', () => {
      expect(isUndefined(undefined)).toBe(true);
    });

    it('returns false for defined input', () => {
      expect(isUndefined('defined')).toBe(false);
      expect(isUndefined(null)).toBe(false);
    });
  });

  describe('isString', () => {
    it('returns true for string input', () => {
      expect(isString('string')).toBe(true);
      expect(isString('')).toBe(true);
    });

    it('returns false for non-string input', () => {
      expect(isString(123)).toBe(false);
      expect(isString(123n)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('returns true for boolean input', () => {
      expect(isBoolean(true)).toBe(true);
    });

    it('returns false for non-boolean input', () => {
      expect(isBoolean('not boolean')).toBe(false);
      expect(isBoolean(1)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('returns true for function input', () => {
      expect(isFunction(() => {})).toBe(true);
    });

    it('returns false for non-function input', () => {
      expect(isFunction('not function')).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('returns true for number input', () => {
      expect(isNumber(123)).toBe(true);
    });

    it('returns false for non-number input', () => {
      expect(isNumber('not number')).toBe(false);
    });
  });

  describe('isBigInt', () => {
    it('returns true for bigint input', () => {
      expect(isBigInt(123n)).toBe(true);
    });

    it('returns false for non-bigint input', () => {
      expect(isBigInt('not bigint')).toBe(false);
    });
  });

  describe('isObject', () => {
    it('returns true for object input', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1, b: '2' })).toBe(true);
    });

    it('returns false for non-object input', () => {
      expect(isObject('not object')).toBe(false);
      expect(isObject(1)).toBe(false);
      expect(isObject(1n)).toBe(false);
    });
  });

  describe('isU8a', () => {
    it('returns true for Uint8Array input', () => {
      expect(isU8a(new Uint8Array())).toBe(true);
    });

    it('returns false for non-Uint8Array input', () => {
      expect(isU8a('not Uint8Array')).toBe(false);
    });
  });

  describe('isHex', () => {
    it('returns true for hex string input', () => {
      expect(isHex('0x123')).toBe(true);
      expect(isHex('0x1234')).toBe(true);
    });

    it('returns true for hex string input with strict mode', () => {
      expect(isHex('0x1234', true)).toBe(true);
    });

    it('returns false for non-hex string input', () => {
      expect(isHex('not hex')).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isHex(123)).toBe(false);
      expect(isHex(123n)).toBe(false);
      expect(isHex({})).toBe(false);
      expect(isHex(null)).toBe(false);
      expect(isHex(undefined)).toBe(false);
    });

    it('returns false for hex string input with odd length in strict mode', () => {
      expect(isHex('0x123', true)).toBe(false);
    });
  });
});
