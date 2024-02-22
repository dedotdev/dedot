import { describe, expect, it } from 'vitest';
import * as $ from '../..';
import { u8aToHex } from '@polkadot/util';

describe('Struct', () => {
  const $struct = $.Struct({
    Field1: $.FlatEnum(['Val1', 'Val2']),
    Field2: $.u8,
    Field3: $.str,
    Field4: $.compactU32,
    Field5: $.Option($.u32),
  });

  it('should encode plain value', () => {
    expect(
      u8aToHex(
        $struct.tryEncode({
          Field1: 'Val1',
          Field2: 10,
          Field3: 'DelightfulDOT',
          Field4: 123,
          Field5: 123,
        }),
      ),
    ).toEqual('0x00' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '017b000000');

    expect(
      u8aToHex(
        $struct.tryEncode({
          Field1: 'Val2',
          Field2: 10,
          Field3: 'DelightfulDOT',
          Field4: 123,
          Field5: undefined,
        }),
      ),
    ).toEqual('0x01' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '00');
  });

  it('should decode raw value', () => {
    expect($struct.tryDecode('0x01' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '00')).toEqual({
      Field1: 'Val2',
      Field2: 10,
      Field3: 'DelightfulDOT',
      Field4: 123,
      Field5: undefined,
    });

    expect($struct.tryDecode('0x00' + '0a' + '3444656c6967687466756c444f54' + 'ed01' + '017b000000')).toEqual({
      Field1: 'Val1',
      Field2: 10,
      Field3: 'DelightfulDOT',
      Field4: 123,
      Field5: 123,
    });
  });

  it('should decode plain serde value', () => {
    // expect(
    //   $struct.tryDecode({
    //     Field1: 'Val1',
    //     Field2: 10,
    //     Field3: 'DelightfulDOT',
    //     Field4: 123,
    //     Field5: 123,
    //   }),
    // ).toEqual({
    //   Field1: 'Val1',
    //   Field2: 10,
    //   Field3: 'DelightfulDOT',
    //   Field4: 123,
    //   Field5: 123,
    // });
  });
});
