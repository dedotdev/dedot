import { describe, expect, it } from 'vitest';
import * as $ from '../..';

describe('collection', () => {
  describe('ShapeMap', () => {
    it('toJSON should work', () => {
      const $map = $.map($.str, $.u8);
      const result = $map.tryEncode(
        new Map<string, number>([
          ['key1', 1],
          ['key2', 2],
        ]),
      );
      expect($map.tryDecode(result).toJSON()).toEqual({
        key1: 1,
        key2: 2,
      });
    });
  });

  describe('ShapeSet', () => {
    it('toJSON should work', () => {
      const $set = $.set($.str);
      const result = $set.tryEncode(new Set<string>(['elm1', 'elm2']));
      expect($set.tryDecode(result).toJSON()).toEqual(['elm1', 'elm2']);
    });
  });
});
