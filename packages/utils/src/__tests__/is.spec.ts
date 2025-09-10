import { describe, it, expect } from 'vitest';
import { concatU8a } from '../concat.js';
import { hexToU8a } from '../hex.js';
import {
  isBigInt,
  isBoolean,
  isFunction,
  isHex,
  isNull,
  isNumber,
  isNumberArray,
  isObject,
  isString,
  isU8a,
  isUndefined,
  isWasm,
  isPvm,
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

  describe('isNumberArray', () => {
    it('returns true for array of numbers', () => {
      expect(isNumberArray([1, 2, 3])).toBe(true);
      expect(isNumberArray([0])).toBe(true);
      expect(isNumberArray([1.5, 2.5, 3.5])).toBe(true);
      expect(isNumberArray([])).toBe(true);
    });

    it('returns false for array with non-number elements', () => {
      expect(isNumberArray([1, '2', 3])).toBe(false);
      expect(isNumberArray(['1', '2', '3'])).toBe(false);
      expect(isNumberArray([1, null, 3])).toBe(false);
      expect(isNumberArray([1, undefined, 3])).toBe(false);
      expect(isNumberArray([1, {}, 3])).toBe(false);
    });

    it('returns false for non-array input', () => {
      expect(isNumberArray('not array')).toBe(false);
      expect(isNumberArray(123)).toBe(false);
      expect(isNumberArray({})).toBe(false);
      expect(isNumberArray(null)).toBe(false);
      expect(isNumberArray(undefined)).toBe(false);
      expect(isNumberArray(new Uint8Array([1, 2, 3]))).toBe(false);
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

  describe('isWasm', () => {
    it('returns true for valid wasm input', () => {
      const wasmInput = hexToU8a('0x0061736d'.padEnd(128, 'ff'));
      expect(isWasm(wasmInput)).toBe(true);
    });

    it('returns true for valid wasm input in hex format', () => {
      const wasmInput = '0x0061736d'.padEnd(128, 'ff');
      expect(isWasm(wasmInput)).toBe(true);
    });

    it('returns false for non-wasm input', () => {
      const nonWasmInput = new Uint8Array([1, 2, 3, 4]);
      expect(isWasm(nonWasmInput)).toBe(false);

      const hasWasmMagicButLengthMismatch = concatU8a(new Uint8Array([0, 97, 115, 109]), new Uint8Array([1, 2, 3]));
      expect(isWasm(hasWasmMagicButLengthMismatch)).toBe(false);
    });

    it('returns false for non-wasm input in hex format', () => {
      const nonWasmInput = '0x01020304'.padEnd(128, 'ff');
      expect(isWasm(nonWasmInput)).toBe(false);
    });

    it('returns false for non-Uint8Array and non-string input', () => {
      // @ts-ignore
      expect(isWasm(123)).toBe(false);
      // @ts-ignore
      expect(isWasm({})).toBe(false);
      // @ts-ignore
      expect(isWasm(null)).toBe(false);
      // @ts-ignore
      expect(isWasm(undefined)).toBe(false);
    });
  });

  describe('isPvm', () => {
    it('returns true for valid pvm input', () => {
      const pvmInput = hexToU8a('0x50564d'.padEnd(128, '0'));
      expect(isPvm(pvmInput)).toBe(true);
    });

    it('returns true for valid pvm input in hex format', () => {
      const pvmInput = '0x50564d'.padEnd(128, '0');
      expect(isPvm(pvmInput)).toBe(true);
    });

    it('returns false for non-pvm input', () => {
      const nonPvmInput = new Uint8Array([1, 2, 3]);
      expect(isPvm(nonPvmInput)).toBe(false);

      const hasPvmPrefixButLengthMismatch = concatU8a(new Uint8Array([0x50, 0x56, 0x4d]), new Uint8Array([1, 2, 3]));
      expect(isPvm(hasPvmPrefixButLengthMismatch)).toBe(false);
    });

    it('returns false for non-pvm input in hex format', () => {
      const nonPvmInput = '0x010203'.padEnd(128, '0');
      expect(isPvm(nonPvmInput)).toBe(false);
    });

    it('returns false for non-Uint8Array and non-string input', () => {
      // @ts-ignore
      expect(isPvm(123)).toBe(false);
      // @ts-ignore
      expect(isPvm({})).toBe(false);
      // @ts-ignore
      expect(isPvm(null)).toBe(false);
      // @ts-ignore
      expect(isPvm(undefined)).toBe(false);
    });
  });
});
