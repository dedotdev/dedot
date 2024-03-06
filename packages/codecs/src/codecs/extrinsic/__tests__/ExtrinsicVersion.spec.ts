import { describe, expect, it } from 'vitest';
import { $ExtrinsicVersion } from '../ExtrinsicVersion';
import { u8aToHex } from '@polkadot/util';

describe('ExtrinsicVersion', () => {
  describe('decode', () => {
    it('should decode properly', () => {
      expect($ExtrinsicVersion.tryDecode('0x84')).toEqual({ signed: true, version: 4 });
      expect($ExtrinsicVersion.tryDecode('0x04')).toEqual({ signed: false, version: 4 });
    });

    it('should not support other version than 4', () => {
      expect(() => $ExtrinsicVersion.tryDecode('0x03')).toThrow('Unsupported extrinsic format version, found: 3');
      expect(() => $ExtrinsicVersion.tryDecode('0x83')).toThrow('Unsupported extrinsic format version, found: 3');
    });
  });

  describe('encode', () => {
    it('should encode properly', () => {
      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            signed: true,
            version: 4,
          }),
        ),
      ).toEqual('0x84');

      expect(
        u8aToHex(
          $ExtrinsicVersion.tryEncode({
            signed: false,
            version: 4,
          }),
        ),
      ).toEqual('0x04');
    });

    it('should not support other version than 4', () => {
      expect(() =>
        $ExtrinsicVersion.tryEncode({
          signed: true,
          version: 3,
        }),
      ).toThrow('Unsupported extrinsic format version, found: 3');

      expect(() =>
        $ExtrinsicVersion.tryEncode({
          signed: false,
          version: 3,
        }),
      ).toThrow('Unsupported extrinsic format version, found: 3');
    });
  });
});
