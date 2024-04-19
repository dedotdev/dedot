import { u8aToHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import * as $ from '../../index.js';

describe('Enum', () => {
  const $e = $.Enum({
    Val1: null,
    Val2: $.u8,
    Val3: $.str,
    Val4: null,
    Val5: { index: 10, value: $.u32 },
  });

  it('should encode plain value', () => {
    expect(u8aToHex($e.tryEncode({ tag: 'Val1' }))).toEqual('0x00');
    expect(u8aToHex($e.tryEncode({ tag: 'Val2', value: 123 }))).toEqual('0x01' + '7b');
    expect(u8aToHex($e.tryEncode({ tag: 'Val3', value: 'DelightfulDOT' }))).toEqual(
      '0x02' + '3444656c6967687466756c444f54',
    );
    expect(u8aToHex($e.tryEncode({ tag: 'Val4' }))).toEqual('0x03');
    expect(u8aToHex($e.tryEncode({ tag: 'Val5', value: 123 }))).toEqual('0x0a' + '7b000000');
  });

  it('should decode raw value', () => {
    expect($e.tryDecode('0x00')).toEqual({ tag: 'Val1' });
    expect($e.tryDecode('0x01' + '7b')).toEqual({ tag: 'Val2', value: 123 });
    expect($e.tryDecode('0x02' + '3444656c6967687466756c444f54')).toEqual({ tag: 'Val3', value: 'DelightfulDOT' });
    expect($e.tryDecode('0x03')).toEqual({ tag: 'Val4' });
    expect($e.tryDecode('0x0a' + '7b000000')).toEqual({ tag: 'Val5', value: 123 });
  });

  it('should decode serde plain value', () => {
    // Ref: https://serde.rs/enum-representations.html#enum-representations
    expect($e.tryDecode('val1')).toEqual({ tag: 'Val1' });
    expect($e.tryDecode({ val2: 10 })).toEqual({ tag: 'Val2', value: 10 });
    expect($e.tryDecode({ val3: 'Hello World' })).toEqual({ tag: 'Val3', value: 'Hello World' });
    expect($e.tryDecode('val4')).toEqual({ tag: 'Val4' });
    expect($e.tryDecode({ val5: 100_000_000 })).toEqual({ tag: 'Val5', value: 100_000_000 });
  });
});
