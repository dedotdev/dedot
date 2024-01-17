import { describe, expect, it } from 'vitest';
import * as $ from '../..';

describe('shape', () => {
  describe('clone', () => {
    it('should deep clone existing shape', () => {
      const $clonedU8 = $.u8.clone();

      expect($clonedU8 === $.u8).toEqual(false);
      expect($clonedU8).toEqual($.u8);
      expect($clonedU8.encode(1000)).toEqual($.u8.encode(1000));
      expect($clonedU8.tryDecode('0x0a')).toEqual($.u8.tryDecode('0x0a'));
    });

    it('should not impact original shape', () => {
      const $clonedU32 = $.u32.clone();
      $clonedU32.registerDecoder(
        () => true,
        () => {},
      );
      expect($clonedU32).not.toEqual($.u32);
    });
  });
});
