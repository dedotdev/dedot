import { describe, expect, it } from 'vitest';
import * as $ from '../..';
import { u8aConcat, u8aToHex } from '@polkadot/util';

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
        u8aConcat($.compactU32.tryEncode(4), Uint8Array.from([18, 18, 18, 18])),
      );

      expect($prefixedHex.tryEncode('0x121212123434')).toEqual(
        u8aConcat($.compactU32.tryEncode(6), Uint8Array.from([18, 18, 18, 18, 52, 52])),
      );
    });
  });
});
