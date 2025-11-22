import { concatU8a, u8aToHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { assert } from '../../deshape.js';
import * as $ from '../../index.js';

describe('hex', () => {
  describe('FixedHex', () => {
    it('should decode fixed hex', () => {
      const $fixedHex = $.FixedHex(4);
      expect($fixedHex.tryDecode('0x12121212')).toEqual('0x12121212');
      expect($fixedHex.tryDecode('0x121212123434')).toEqual('0x12121212');
    });

    it('should encode fixed hex', () => {
      const $fixedHex = $.FixedHex(4);
      expect($fixedHex.tryEncode('0x12121212')).toEqual(Uint8Array.from([18, 18, 18, 18]));
    });
  });

  describe('PrefixedHex', () => {
    it('should decode prefixed hex', () => {
      const $prefixedHex = $.PrefixedHex;

      expect($prefixedHex.tryDecode(u8aToHex($.compactU32.tryEncode(4)) + '12121212')).toEqual('0x12121212');
      expect($prefixedHex.tryDecode(u8aToHex($.compactU32.tryEncode(4)) + '121212123434')).toEqual('0x12121212');
      expect($prefixedHex.tryDecode(u8aToHex($.compactU32.tryEncode(6)) + '121212123434')).toEqual('0x121212123434');
    });

    it('should encode fixed hex', () => {
      const $prefixedHex = $.PrefixedHex;
      expect($prefixedHex.tryEncode('0x12121212')).toEqual(
        concatU8a($.compactU32.tryEncode(4), Uint8Array.from([18, 18, 18, 18])),
      );

      expect($prefixedHex.tryEncode('0x121212123434')).toEqual(
        concatU8a($.compactU32.tryEncode(6), Uint8Array.from([18, 18, 18, 18, 52, 52])),
      );
    });

    describe('subAssert', () => {
      describe('valid inputs', () => {
        it('should accept valid hex string with 0x prefix', () => {
          expect(() => assert($.PrefixedHex, '0x1234')).not.toThrow();
          expect(() => assert($.PrefixedHex, '0xabcdef')).not.toThrow();
          expect(() => assert($.PrefixedHex, '0xABCDEF')).not.toThrow();
        });

        it('should accept valid hex string', () => {
          expect(() => assert($.PrefixedHex, '0x121212123434')).not.toThrow();
        });

        it('should accept empty hex 0x', () => {
          expect(() => assert($.PrefixedHex, '0x')).not.toThrow();
        });

        it('should accept long hex string', () => {
          expect(() => assert($.PrefixedHex, '0x' + '00'.repeat(1000))).not.toThrow();
        });
      });

      describe('invalid type errors', () => {
        it('should throw for non-string input', () => {
          expect(() => assert($.PrefixedHex, 123 as any)).toThrow();
        });

        it('should throw for number', () => {
          expect(() => assert($.PrefixedHex, 42 as any)).toThrow();
        });

        it('should throw for null', () => {
          expect(() => assert($.PrefixedHex, null as any)).toThrow();
        });

        it('should throw for undefined', () => {
          expect(() => assert($.PrefixedHex, undefined as any)).toThrow();
        });

        it('should throw for object', () => {
          expect(() => assert($.PrefixedHex, {} as any)).toThrow();
        });

        it('should throw for Uint8Array', () => {
          expect(() => assert($.PrefixedHex, new Uint8Array([1, 2, 3]) as any)).toThrow();
        });
      });

      describe('invalid hex errors', () => {
        it('should throw for invalid hex characters', () => {
          expect(() => assert($.PrefixedHex, '0xGGGG')).toThrow();
          expect(() => assert($.PrefixedHex, '0xZZZZ')).toThrow();
        });

        it('should throw for non-hex string', () => {
          expect(() => assert($.PrefixedHex, 'not-hex')).toThrow();
          expect(() => assert($.PrefixedHex, 'hello')).toThrow();
        });

        it('should throw for string without 0x prefix', () => {
          expect(() => assert($.PrefixedHex, '1234')).toThrow();
        });

        it('should throw for string with spaces', () => {
          expect(() => assert($.PrefixedHex, '0x12 34')).toThrow();
        });
      });
    });
  });
});
