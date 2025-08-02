import { u8aToHex } from '@dedot/utils';
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
});
