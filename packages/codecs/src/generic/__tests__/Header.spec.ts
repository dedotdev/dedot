import { describe, expect, it } from 'vitest';
import { $BlockNumber, $HeaderBlockNumber } from '../Header';
import * as $ from '@dedot/shape';

describe('Header', () => {
  describe('$BlockNumber', () => {
    it('should decode & encode u32', () => {
      expect($BlockNumber.tryEncode(10_000_000)).toEqual($.u32.tryEncode(10_000_000));
      const u8a = $.u32.tryEncode(10_000_000);
      expect($BlockNumber.tryDecode(u8a)).toEqual($.u32.tryDecode(u8a));
    });
  });
  describe('$HeaderBlockNumber', () => {
    it('should decode block number in BE hex format', () => {
      expect($HeaderBlockNumber.tryDecode('0x1231da1')).toEqual(19078561);
    });

    it('should not impact original $compactU32 codec', () => {
      expect($.compactU32.tryDecode('0x3e1c3d00')).toEqual(1001231);
    });
  });
});
