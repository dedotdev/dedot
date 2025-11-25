import { u8aToHex } from '@dedot/utils';
import { assert } from '@dedot/shape';
import { describe, expect, it } from 'vitest';
import { $ExtrinsicVersion, ExtrinsicType } from '../ExtrinsicVersion.js';

describe('ExtrinsicVersion', () => {
  describe('decode', () => {
    it('should decode v4 properly', () => {
      expect($ExtrinsicVersion.tryDecode('0x84')).toEqual({ type: ExtrinsicType.Signed, version: 4 });
      expect($ExtrinsicVersion.tryDecode('0x04')).toEqual({ type: ExtrinsicType.Bare, version: 4 });
    });

    it('should decode v5 properly', () => {
      // v5 bare extrinsic: 0b0000_0000 | 5 = 0x05
      expect($ExtrinsicVersion.tryDecode('0x05')).toEqual({ type: ExtrinsicType.Bare, version: 5 });
      // v5 signed extrinsic: 0b1000_0000 | 5 = 0x85
      expect($ExtrinsicVersion.tryDecode('0x85')).toEqual({ type: ExtrinsicType.Signed, version: 5 });
      // v5 general extrinsic: 0b0100_0000 | 5 = 0x45
      expect($ExtrinsicVersion.tryDecode('0x45')).toEqual({ type: ExtrinsicType.General, version: 5 });
    });

    it('should not support other version than 4 and 5', () => {
      expect(() => $ExtrinsicVersion.tryDecode('0x03')).toThrow('Unsupported extrinsic format version: 3');
      expect(() => $ExtrinsicVersion.tryDecode('0x83')).toThrow('Unsupported extrinsic format version: 3');
      expect(() => $ExtrinsicVersion.tryDecode('0x06')).toThrow('Unsupported extrinsic format version: 6');
    });
  });

  describe('encode', () => {
    it('should encode v4 properly', () => {
      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            type: ExtrinsicType.Signed,
            version: 4,
          }),
        ),
      ).toEqual('0x84');

      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            type: ExtrinsicType.Bare,
            version: 4,
          }),
        ),
      ).toEqual('0x04');
    });

    it('should encode v5 properly', () => {
      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            type: ExtrinsicType.Bare,
            version: 5,
          }),
        ),
      ).toEqual('0x05');

      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            type: ExtrinsicType.Signed,
            version: 5,
          }),
        ),
      ).toEqual('0x85');

      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            type: ExtrinsicType.General,
            version: 5,
          }),
        ),
      ).toEqual('0x45');
    });

    it('should not support other version than 4 and 5', () => {
      expect(() =>
        $ExtrinsicVersion.tryEncode({
          type: ExtrinsicType.Signed,
          version: 3,
        }),
      ).toThrow('Unsupported extrinsic format version, found: 3');

      expect(() =>
        $ExtrinsicVersion.tryEncode({
          type: ExtrinsicType.Bare,
          version: 3,
        }),
      ).toThrow('Unsupported extrinsic format version, found: 3');

      expect(() =>
        $ExtrinsicVersion.tryEncode({
          type: ExtrinsicType.General,
          version: 6,
        }),
      ).toThrow('Unsupported extrinsic format version, found: 6');
    });
  });

  describe('subAssert', () => {
    describe('valid inputs', () => {
      it('should accept valid V4 Signed extrinsic version', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: ExtrinsicType.Signed })).not.toThrow();
      });

      it('should accept valid V4 Bare extrinsic version', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: ExtrinsicType.Bare })).not.toThrow();
      });

      it('should accept valid V5 Bare extrinsic version', () => {
        expect(() => assert($ExtrinsicVersion, { version: 5, type: ExtrinsicType.Bare })).not.toThrow();
      });

      it('should accept valid V5 Signed extrinsic version', () => {
        expect(() => assert($ExtrinsicVersion, { version: 5, type: ExtrinsicType.Signed })).not.toThrow();
      });

      it('should accept valid V5 General extrinsic version', () => {
        expect(() => assert($ExtrinsicVersion, { version: 5, type: ExtrinsicType.General })).not.toThrow();
      });
    });

    describe('invalid type errors', () => {
      it('should throw for non-object input', () => {
        expect(() => assert($ExtrinsicVersion, 'string' as any)).toThrow();
        expect(() => assert($ExtrinsicVersion, 123 as any)).toThrow();
      });

      it('should throw for null', () => {
        expect(() => assert($ExtrinsicVersion, null as any)).toThrow();
      });

      it('should throw for array', () => {
        expect(() => assert($ExtrinsicVersion, [] as any)).toThrow();
      });
    });

    describe('invalid version errors', () => {
      it('should throw for version field as string', () => {
        expect(() => assert($ExtrinsicVersion, { version: '4' as any, type: ExtrinsicType.Signed })).toThrow();
      });

      it('should throw for invalid version number (3)', () => {
        expect(() => assert($ExtrinsicVersion, { version: 3, type: ExtrinsicType.Signed })).toThrow();
      });

      it('should throw for invalid version number (6)', () => {
        expect(() => assert($ExtrinsicVersion, { version: 6, type: ExtrinsicType.Bare })).toThrow();
      });

      it('should throw for missing version field', () => {
        expect(() => assert($ExtrinsicVersion, { type: ExtrinsicType.Signed } as any)).toThrow();
      });

      it('should throw for version 0', () => {
        expect(() => assert($ExtrinsicVersion, { version: 0, type: ExtrinsicType.Bare })).toThrow();
      });

      it('should throw for version 1', () => {
        expect(() => assert($ExtrinsicVersion, { version: 1, type: ExtrinsicType.Bare })).toThrow();
      });
    });

    describe('invalid type errors', () => {
      it('should throw for type field as number', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: 1 as any })).toThrow();
      });

      it('should throw for invalid type string', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: 'invalid' as any })).toThrow();
      });

      it('should throw for missing type field', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4 } as any)).toThrow();
      });
    });

    describe('version-specific constraints', () => {
      it('should throw for V4 with General type', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: ExtrinsicType.General })).toThrow(
          /does not support type 'general'/,
        );
      });

      it('should accept V4 with Signed type', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: ExtrinsicType.Signed })).not.toThrow();
      });

      it('should accept V4 with Bare type', () => {
        expect(() => assert($ExtrinsicVersion, { version: 4, type: ExtrinsicType.Bare })).not.toThrow();
      });

      it('should accept V5 with Bare type', () => {
        expect(() => assert($ExtrinsicVersion, { version: 5, type: ExtrinsicType.Bare })).not.toThrow();
      });

      it('should accept V5 with General type', () => {
        expect(() => assert($ExtrinsicVersion, { version: 5, type: ExtrinsicType.General })).not.toThrow();
      });
    });
  });
});
