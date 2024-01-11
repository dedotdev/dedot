import { describe, expect, it } from 'vitest';
import * as $ from '../..';
import { u8aToHex } from '@polkadot/util';

describe('lean codecs', () => {
  describe('Enum', () => {
    const $e = $.Enum({
      Val1: null,
      Val2: $.u8,
      Val3: $.str,
      Val4: null,
      Val5: { index: 10, value: $.u32 },
    });

    it('should encode plain value', () => {
      expect(u8aToHex($e.tryEncode({ tag: 'Val1' }))).toEqual('0x00');
      expect(u8aToHex($e.tryEncode({ tag: 'Val2', value: 123 }))).toEqual('0x01' + '7b');
      expect(u8aToHex($e.tryEncode({ tag: 'Val3', value: 'DelightfulDOT' }))).toEqual(
        '0x02' + '3444656c6967687466756c444f54',
      );
      expect(u8aToHex($e.tryEncode({ tag: 'Val4' }))).toEqual('0x03');
      expect(u8aToHex($e.tryEncode({ tag: 'Val5', value: 123 }))).toEqual('0x0a' + '7b000000');
    });

    it('should decode raw value', () => {
      expect($e.tryDecode('0x00')).toEqual({ tag: 'Val1' });
      expect($e.tryDecode('0x01' + '7b')).toEqual({ tag: 'Val2', value: 123 });
      expect($e.tryDecode('0x02' + '3444656c6967687466756c444f54')).toEqual({ tag: 'Val3', value: 'DelightfulDOT' });
      expect($e.tryDecode('0x03')).toEqual({ tag: 'Val4' });
      expect($e.tryDecode('0x0a' + '7b000000')).toEqual({ tag: 'Val5', value: 123 });
    });
  });

  describe('Struct', () => {
    const $struct = $.Struct({
      Field1: $.FlatEnum(['Val1', 'Val2']),
      Field2: $.u8,
      Field3: $.str,
      Field4: $.compactU32,
      Field5: $.Option($.u32),
    });

    it('should encode plain value', () => {
      expect(
        u8aToHex(
          $struct.tryEncode({
            Field1: 'Val1',
            Field2: 10,
            Field3: 'DelightfulDOT',
            Field4: 123,
            Field5: 123,
          }),
        ),
      ).toEqual('0x00' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '017b000000');

      expect(
        u8aToHex(
          $struct.tryEncode({
            Field1: 'Val2',
            Field2: 10,
            Field3: 'DelightfulDOT',
            Field4: 123,
            Field5: undefined,
          }),
        ),
      ).toEqual('0x01' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '00');
    });

    it('should decode raw value', () => {
      expect($struct.tryDecode('0x01' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '00')).toEqual({
        Field1: 'Val2',
        Field2: 10,
        Field3: 'DelightfulDOT',
        Field4: 123,
        Field5: undefined,
      });

      expect($struct.tryDecode('0x00' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '017b000000')).toEqual({
        Field1: 'Val1',
        Field2: 10,
        Field3: 'DelightfulDOT',
        Field4: 123,
        Field5: 123,
      });
    });
  });
});
