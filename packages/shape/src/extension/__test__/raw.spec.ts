import { u8aToHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { assert } from '../../deshape.js';
import * as $ from '../../index.js';

describe('RawHex', () => {
  describe('encode', () => {
    it('should encode valid hex string', () => {
      expect($.RawHex.tryEncode('0x1234')).toEqual(Uint8Array.from([0x12, 0x34]));
      expect($.RawHex.tryEncode('0xabcdef')).toEqual(Uint8Array.from([0xab, 0xcd, 0xef]));
    });

    it('should encode empty hex string', () => {
      expect($.RawHex.tryEncode('0x')).toEqual(Uint8Array.from([]));
    });
  });

  describe('decode', () => {
    it('should decode to hex string', () => {
      const buffer = new $.DecodeBuffer(Uint8Array.from([0x12, 0x34]));
      expect($.RawHex.subDecode(buffer)).toEqual('0x1234');
    });

    it('should decode empty buffer', () => {
      const buffer = new $.DecodeBuffer(Uint8Array.from([]));
      expect($.RawHex.subDecode(buffer)).toEqual('0x');
    });
  });

  describe('subAssert', () => {
    describe('valid inputs', () => {
      it('should accept valid hex string with 0x prefix', () => {
        expect(() => assert($.RawHex, '0x1234')).not.toThrow();
        expect(() => assert($.RawHex, '0xabcdef')).not.toThrow();
        expect(() => assert($.RawHex, '0xABCDEF')).not.toThrow();
      });

      it('should accept empty hex string', () => {
        expect(() => assert($.RawHex, '0x')).not.toThrow();
      });

      it('should accept long hex string', () => {
        expect(() => assert($.RawHex, '0x' + '00'.repeat(100))).not.toThrow();
      });
    });

    describe('invalid type errors', () => {
      it('should throw for non-string input', () => {
        expect(() => assert($.RawHex, 123 as any)).toThrow();
      });

      it('should throw for number input', () => {
        expect(() => assert($.RawHex, 42 as any)).toThrow();
      });

      it('should throw for object input', () => {
        expect(() => assert($.RawHex, {} as any)).toThrow();
      });

      it('should throw for null', () => {
        expect(() => assert($.RawHex, null as any)).toThrow();
      });

      it('should throw for undefined', () => {
        expect(() => assert($.RawHex, undefined as any)).toThrow();
      });

      it('should throw for array', () => {
        expect(() => assert($.RawHex, [] as any)).toThrow();
      });

      it('should throw for Uint8Array', () => {
        expect(() => assert($.RawHex, new Uint8Array([1, 2, 3]) as any)).toThrow();
      });
    });

    describe('invalid hex errors', () => {
      it('should throw for invalid hex characters', () => {
        expect(() => assert($.RawHex, '0xGGGG')).toThrow();
        expect(() => assert($.RawHex, '0xZZZZ')).toThrow();
      });

      it('should throw for string without 0x prefix and not hex', () => {
        expect(() => assert($.RawHex, 'not-hex')).toThrow();
        expect(() => assert($.RawHex, 'hello')).toThrow();
      });

      it('should throw for string with invalid format', () => {
        expect(() => assert($.RawHex, '1234')).toThrow(); // missing 0x
      });

      it('should throw for string with spaces', () => {
        expect(() => assert($.RawHex, '0x12 34')).toThrow();
      });
    });
  });
});
