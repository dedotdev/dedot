import { describe, it, expect } from 'vitest';
import { u8aEq, u8aToHex, u8aToString } from '../u8a.js';

describe('u8a', () => {
  describe('u8aToHex', () => {
    it.each([
      [undefined, '0x'],
      [null, '0x'],
      [new Uint8Array(), '0x'],
      [new Uint8Array([128, 0, 10]), '0x80000a'],
      [new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0]), '0x0001000000000000'],
      [new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]), '0x68656c6c6f20776f726c64'],
      [new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]), '0x123456789abcdef0'],
      [
        new Uint8Array([
          0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99, 0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, 0x00,
        ]),
        '0xffeeddccbbaa99887766554433221100',
      ],
      [new Uint8Array([0x1a, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x7a, 0x8b, 0x9c, 0xad]), '0x1a2b3c4d5e6f7a8b9cad'],
    ])('should convert from %o to %o', (input, output) => {
      expect(u8aToHex(input)).toEqual(output);
    });
  });

  describe('u8aToString', () => {
    it.each([
      [undefined, ''],
      [null, ''],
      [new Uint8Array(), ''],
      [
        new Uint8Array([
          208, 159, 209, 128, 208, 184, 208, 178, 208, 181, 209, 130, 44, 32, 208, 188, 208, 184, 209, 128, 33,
        ]),
        'Привет, мир!',
      ],
      [new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]), 'hello world'],
      [new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x21, 0x40, 0x23, 0x24, 0x25]), 'Hello !@#$%'],
      [new Uint8Array([0xc3, 0xa9, 0xc3, 0xa8, 0xc3, 0xaa, 0xc3, 0xab]), 'éèêë'],
      [new Uint8Array([0xe2, 0x82, 0xac, 0xe2, 0x98, 0x83]), '€☃'],
      [
        new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x20, 0x1f, 0x37, 0x7f]),
        'Hello World \x1f7\x7f',
      ],
    ])('should convert from %o to %o', (input, output) => {
      expect(u8aToString(input)).toEqual(output);
    });
  });

  describe('u8aEq', () => {
    it('should return true for two identical Uint8Arrays', () => {
      const array1 = new Uint8Array([1, 2, 3]);
      const array2 = new Uint8Array([1, 2, 3]);
      expect(u8aEq(array1, array2)).toEqual(true);
    });

    it('should return false for two different Uint8Arrays', () => {
      const array1 = new Uint8Array([1, 2, 3]);
      const array2 = new Uint8Array([4, 5, 6]);
      expect(u8aEq(array1, array2)).toEqual(false);
    });

    it('should return false for two Uint8Arrays of different lengths', () => {
      const array1 = new Uint8Array([1, 2, 3]);
      const array2 = new Uint8Array([1, 2, 3, 4]);
      expect(u8aEq(array1, array2)).toEqual(false);
    });

    it('should return true for two empty Uint8Arrays', () => {
      const array1 = new Uint8Array();
      const array2 = new Uint8Array();
      expect(u8aEq(array1, array2)).toEqual(true);
    });
  });
});
