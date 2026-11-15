import { describe, expect, it } from 'vitest';
import * as $ from '../../index.js';

const END_OF_INPUT = /Unexpected end of input/;

// compact length prefix of a sequence
const len = (length: number) => $.compactU32.encode(length);
const concat = (...parts: (Uint8Array | number[])[]) => Uint8Array.from(parts.flatMap((p) => Array.from(p)));

// Lengths an attacker can declare in a few bytes
const HUGE_LENGTHS = [1024, 2 ** 16, 2 ** 20, 2 ** 26, 2 ** 30 - 1, 2 ** 32 - 1];

describe('decoding truncated sequences', () => {
  describe('Vec', () => {
    const $pair = $.Tuple($.PrefixedHex, $.PrefixedHex);

    it.each([
      ['Vec<u8>', $.Vec($.u8)],
      ['Vec<bool>', $.Vec($.bool)],
      ['Vec<compact>', $.Vec($.compactU32)],
      ['Vec<Bytes>', $.Vec($.PrefixedHex)],
      ['Vec<(Bytes, Bytes)>', $.Vec($pair)],
      ['Vec<Vec<u8>>', $.Vec($.Vec($.u8))],
      ['Vec<Vec<Vec<bool>>>', $.Vec($.Vec($.Vec($.bool)))],
      ['Vec<Option<u8>>', $.Vec($.Option($.u8))],
      ['Vec<str>', $.Vec($.str)],
      ['Vec<u32>', $.Vec($.u32)],
      ['Vec<Struct>', $.Vec($.Struct({ a: $.u8, b: $.bool }))],
      ['Vec<[u8; 32]>', $.Vec($.FixedHex(32))],
      ['Vec<[bool; 1024]>', $.Vec($.SizedVec($.bool, 1024 as number))],
    ])('should reject %s declaring a huge length without elements, quickly', (_, $shape: $.Shape<any>) => {
      for (const length of HUGE_LENGTHS) {
        const start = performance.now();
        expect(() => $shape.tryDecode(len(length))).toThrowError();
        expect(performance.now() - start).toBeLessThan(100);
      }
    });

    it('should reject a declared length that exceeds the remaining input', () => {
      expect(() => $.Vec($.u8).tryDecode(concat(len(4), [1, 2, 3]))).toThrowError(
        'Unexpected end of input: declared length 4 exceeds the remaining input (3 bytes)',
      );

      expect(() => $.Vec($.bool).tryDecode(len(2 ** 26))).toThrowError(
        'Unexpected end of input: declared length 67108864 exceeds the remaining input (0 bytes)',
      );
    });

    it('should reject when the input runs out in the middle of the elements', () => {
      // 2 pairs declared, the second one is cut off
      const input = concat(len(2), len(1), [0xaa], len(1), [0xbb], len(1), [0xcc]);
      expect(() => $.Vec($pair).tryDecode(input)).toThrowError(END_OF_INPUT);

      // declared length fits the remaining bytes, but the elements need more than that
      expect(() => $.Vec($.u32).tryDecode(concat(len(2), [1, 0, 0, 0, 2, 0]))).toThrowError();
      expect(() => $.Vec($.FixedHex(4)).tryDecode(concat(len(2), [1, 2, 3, 4, 5, 6]))).toThrowError(END_OF_INPUT);
    });

    it('should reject a nested sequence declaring a huge length', () => {
      // outer: 1 element, inner: 2^26 elements & nothing else
      expect(() => $.Vec($.Vec($.u8)).tryDecode(concat(len(1), len(2 ** 26)))).toThrowError(END_OF_INPUT);
      expect(() => $.Vec($.Vec($pair)).tryDecode(concat(len(1), len(2 ** 26)))).toThrowError(END_OF_INPUT);
    });

    it('should reject a huge length inside a length-prefixed slice', () => {
      // the outer length prefix bounds the slice, the inner one declares more than the slice holds
      const body = len(2 ** 26);
      const input = concat(len(body.length), body, new Uint8Array(1024));

      expect(() => $.lenPrefixed($.Vec($.u8)).tryDecode(input)).toThrowError(END_OF_INPUT);
    });

    it('should decode valid sequences', () => {
      expect($.Vec($.u8).tryDecode('0x00')).toEqual([]);
      expect($.Vec($.u8).tryDecode('0x0c010203')).toEqual([1, 2, 3]);
      expect($.Vec($.bool).tryDecode('0x080100')).toEqual([true, false]);
      expect($.Vec($pair).tryDecode('0x0404010402')).toEqual([['0x01', '0x02']]);
      expect($.Vec($.Vec($.u8)).tryDecode('0x08040100')).toEqual([[1], []]);
      expect($.Vec($.str).tryDecode($.Vec($.str).tryEncode(['a', 'bc']))).toEqual(['a', 'bc']);
    });

    it('should round-trip a large valid sequence', () => {
      const values = Array.from({ length: 100_000 }, (_, i) => i % 256);
      const $shape = $.Vec($.u8);

      expect($shape.tryDecode($shape.tryEncode(values))).toEqual(values);
    });

    it('should still decode plain arrays', () => {
      expect($.Vec($.u8).tryDecode([1, 2, 3])).toEqual([1, 2, 3]);
    });

    describe('zero-sized elements', () => {
      const $unit = $.Tuple();

      it('should decode a sequence of zero-sized elements', () => {
        expect($.Vec($unit).tryDecode(len(3))).toEqual([[], [], []]);
        expect($.Vec($unit).tryDecode(len($.MAX_ZERO_SIZED_ELEMENTS)).length).toEqual($.MAX_ZERO_SIZED_ELEMENTS);
      });

      it('should reject a sequence of zero-sized elements over the limit', () => {
        for (const length of [$.MAX_ZERO_SIZED_ELEMENTS + 1, 2 ** 26, 2 ** 30 - 1]) {
          expect(() => $.Vec($unit).tryDecode(len(length))).toThrowError(
            `Declared length ${length} of zero-sized elements exceeds the limit (${$.MAX_ZERO_SIZED_ELEMENTS})`,
          );
        }
      });
    });
  });

  describe('map & set', () => {
    it('should reject a map declaring a huge length without entries', () => {
      for (const length of HUGE_LENGTHS) {
        expect(() => $.map($.u8, $.PrefixedHex).tryDecode(len(length))).toThrowError(END_OF_INPUT);
        expect(() => $.set($.u8).tryDecode(len(length))).toThrowError(END_OF_INPUT);
      }
    });

    it('should decode valid map & set', () => {
      const $map = $.map($.u8, $.PrefixedHex);
      const decodedMap = $map.tryDecode('0x080104aa0204bb');
      expect(decodedMap).toBeInstanceOf($.ShapeMap);
      expect([...decodedMap.entries()]).toEqual([
        [1, '0xaa'],
        [2, '0xbb'],
      ]);
      expect($map.tryDecode($map.tryEncode(decodedMap)).get(2)).toEqual('0xbb');

      const decodedSet = $.set($.u8).tryDecode('0x080102');
      expect(decodedSet).toBeInstanceOf($.ShapeSet);
      expect([...decodedSet]).toEqual([1, 2]);
    });
  });
});
