import { describe, expect, it } from 'vitest';
import * as $ from '../../index.js';
import { hexToU8a } from '@polkadot/util';

describe('str', () => {
  describe('FixedStr', () => {
    it('should decode str', () => {
      const $fixedStr = $.FixedStr(13);
      expect($fixedStr.tryDecode('0x44656c6967687466756c444f54')).toEqual('DelightfulDOT');
    });

    it('should encode str', () => {
      const $fixedStr = $.FixedStr(13);
      expect($fixedStr.tryEncode('DelightfulDOT')).toEqual(hexToU8a('0x44656c6967687466756c444f54'));
    });
  });
});
