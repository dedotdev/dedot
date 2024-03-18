import { describe, expect, it } from 'vitest';
import * as $ from '../../index.js';
import { u8aToHex } from '@dedot/utils';

describe('object', () => {
  it('should decode plain object', () => {
    const $codec = $.object($.field('a', $.u8), $.field('b', $.str));

    expect(
      $codec.tryDecode({
        a: 10,
        b: 'DelightfulDOT',
      }),
    ).toEqual({
      a: 10,
      b: 'DelightfulDOT',
    });

    expect(
      $codec.tryDecode({
        a: $.u8.tryEncode(10),
        b: $.str.tryEncode('DelightfulDOT'),
      }),
    ).toEqual({
      a: 10,
      b: 'DelightfulDOT',
    });

    expect(
      $codec.tryDecode({
        a: u8aToHex($.u8.tryEncode(10)),
        b: u8aToHex($.str.tryEncode('DelightfulDOT')),
      }),
    ).toEqual({
      a: 10,
      b: 'DelightfulDOT',
    });
  });
});
