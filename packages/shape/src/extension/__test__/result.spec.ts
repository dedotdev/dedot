import { describe, it, expect, beforeEach } from 'vitest';
import { u8aToHex } from '@polkadot/util';
import * as $ from '../../index.js';

describe('Result', () => {
  let $x: $.Shape<any, any>;
  beforeEach(() => {
    $x = $.Result($.u8, $.bool);
  });

  it('should encode ok', () => {
    expect(u8aToHex($x.encode({ isOk: true, value: 42 }))).toEqual('0x002a');
  });

  it('should decode ok', () => {
    expect($x.tryDecode('0x002a')).toEqual({ isOk: true, isErr: false, value: 42 });
  });

  it('should encode err', () => {
    expect(u8aToHex($x.encode({ isErr: true, err: false }))).toEqual('0x0100');
  });

  it('should decode err', () => {
    expect($x.tryDecode('0x0100')).toEqual({ isOk: false, isErr: true, err: false });
  });

  describe('nested result', () => {
    let $x: $.Shape<any, any>;
    beforeEach(() => {
      $x = $.Result($.Result($.u8, $.bool), $.Struct({ index: $.u32 }));
    });

    it('should encode ok / ok', () => {
      expect(u8aToHex($x.encode({ isOk: true, value: { isOk: true, value: 42 } }))).toEqual('0x00002a');
      expect(u8aToHex($x.encode({ isOk: true, value: { isErr: false, value: 42 } }))).toEqual('0x00002a');
    });

    it('should decode ok / ok', () => {
      expect($x.tryDecode('0x00002a')).toEqual({
        isOk: true,
        isErr: false,
        value: { isOk: true, isErr: false, value: 42 },
      });
    });

    it('should encode ok / err', () => {
      expect(u8aToHex($x.encode({ isOk: true, value: { isErr: true, err: false } }))).toEqual('0x000100');
      expect(u8aToHex($x.encode({ isOk: true, value: { isOk: false, err: false } }))).toEqual('0x000100');
    });

    it('should decode ok / err', () => {
      expect($x.tryDecode('0x000100')).toEqual({
        isOk: true,
        isErr: false,
        value: { isOk: false, isErr: true, err: false },
      });
    });

    it('should encode err', () => {
      expect(u8aToHex($x.encode({ isErr: true, err: { index: 42 } }))).toEqual('0x012a000000');
    });

    it('should decode err', () => {
      expect($x.tryDecode('0x012a000000')).toEqual({
        isOk: false,
        isErr: true,
        err: { index: 42 },
      });
    });
  });
});
