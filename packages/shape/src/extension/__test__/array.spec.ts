import { describe, expect, it } from 'vitest';
import * as $ from '../..';

describe('array', () => {
  it('should decode plain array', () => {
    const $u8a = $.array($.u8);
    expect($u8a.tryDecode([1, 2, 3])).toEqual([1, 2, 3]);

    const $strA = $.array($.str);
    expect($strA.tryDecode(['1', '12', '123'])).toEqual(['1', '12', '123']);
  });

  it('should throws error for invalid plain array', () => {
    const $u8a = $.array($.u8);
    expect(() => {
      $u8a.tryDecode([1, 2, '3']);
    }).toThrowError();
  });
});
