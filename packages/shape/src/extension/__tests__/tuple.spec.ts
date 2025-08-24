import { u8aToHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import * as $ from '../../index.js';

describe('tuple', () => {
  const $simpleTuple = $.Tuple($.u8, $.u32);
  const $mixedTuple = $.Tuple($.str, $.u8, $.Option($.u32));

  it('should encode tuple values', () => {
    expect(u8aToHex($simpleTuple.tryEncode([10, 123]))).toEqual('0x0a7b000000');
    expect(u8aToHex($mixedTuple.tryEncode(['hello', 42, 100]))).toEqual('0x1468656c6c6f2a0164000000');
    expect(u8aToHex($mixedTuple.tryEncode(['test', 5, undefined]))).toEqual('0x107465737405' + '00');
  });

  it('should decode raw values', () => {
    expect($simpleTuple.tryDecode('0x0a7b000000')).toEqual([10, 123]);
    expect($mixedTuple.tryDecode('0x1468656c6c6f2a0164000000')).toEqual(['hello', 42, 100]);
    expect($mixedTuple.tryDecode('0x107465737405' + '00')).toEqual(['test', 5, undefined]);
  });

  it('should decode array inputs', () => {
    expect($simpleTuple.tryDecode([10, 123])).toEqual([10, 123]);
    expect($mixedTuple.tryDecode(['hello', 42, 100])).toEqual(['hello', 42, 100]);
    expect($mixedTuple.tryDecode(['test', 5, undefined])).toEqual(['test', 5, undefined]);
  });

  it('should decode array inputs with fallback to toU8a', () => {
    const $byteArrayTuple = $.Tuple($.u8, $.u8, $.u8);
    expect($byteArrayTuple.tryDecode([0x12, 0x34, 0x56])).toEqual([0x12, 0x34, 0x56]);

    // Test case where array elements need conversion via toU8a
    const $hexTuple = $.Tuple($.FixedHex(1), $.FixedHex(1));
    expect($hexTuple.tryDecode([[0x12], [0x34]])).toEqual(['0x12', '0x34']);
  });

  it('should handle empty tuple', () => {
    const $emptyTuple = $.Tuple();
    expect(u8aToHex($emptyTuple.tryEncode([]))).toEqual('0x');
    expect($emptyTuple.tryDecode('0x')).toEqual([]);
    expect($emptyTuple.tryDecode([])).toEqual([]);
  });

  it('should handle nested tuples', () => {
    const $nestedTuple = $.Tuple($.Tuple($.u8, $.u8), $.u32);
    expect(u8aToHex($nestedTuple.tryEncode([[1, 2], 100]))).toEqual('0x010264000000');
    expect($nestedTuple.tryDecode('0x010264000000')).toEqual([[1, 2], 100]);
    expect($nestedTuple.tryDecode([[1, 2], 100])).toEqual([[1, 2], 100]);
  });

  it('should handle type mismatches with toU8a fallback', () => {
    const $numberTuple = $.Tuple($.u32, $.u32);

    // This should work with direct array input
    expect($numberTuple.tryDecode([1000, 2000])).toEqual([1000, 2000]);

    // This should fallback to toU8a for individual elements that fail direct decoding
    expect(
      $numberTuple.tryDecode([new Uint8Array([0xe8, 0x03, 0x00, 0x00]), new Uint8Array([0xd0, 0x07, 0x00, 0x00])]),
    ).toEqual([1000, 2000]);
  });
});
