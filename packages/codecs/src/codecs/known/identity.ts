import * as $ from '@dedot/shape';
import { HexString, stringToU8a } from '@dedot/utils';

export const $DataRaw = $.Enum({
  None: null,
  Raw0: $.FixedStr(0),
  Raw1: $.FixedStr(1),
  Raw2: $.FixedStr(2),
  Raw3: $.FixedStr(3),
  Raw4: $.FixedStr(4),
  Raw5: $.FixedStr(5),
  Raw6: $.FixedStr(6),
  Raw7: $.FixedStr(7),
  Raw8: $.FixedStr(8),
  Raw9: $.FixedStr(9),
  Raw10: $.FixedStr(10),
  Raw11: $.FixedStr(11),
  Raw12: $.FixedStr(12),
  Raw13: $.FixedStr(13),
  Raw14: $.FixedStr(14),
  Raw15: $.FixedStr(15),
  Raw16: $.FixedStr(16),
  Raw17: $.FixedStr(17),
  Raw18: $.FixedStr(18),
  Raw19: $.FixedStr(19),
  Raw20: $.FixedStr(20),
  Raw21: $.FixedStr(21),
  Raw22: $.FixedStr(22),
  Raw23: $.FixedStr(23),
  Raw24: $.FixedStr(24),
  Raw25: $.FixedStr(25),
  Raw26: $.FixedStr(26),
  Raw27: $.FixedStr(27),
  Raw28: $.FixedStr(28),
  Raw29: $.FixedStr(29),
  Raw30: $.FixedStr(30),
  Raw31: $.FixedStr(31),
  Raw32: $.FixedStr(32),
  BlakeTwo256: $.FixedHex(32),
  Sha256: $.FixedHex(32),
  Keccak256: $.FixedHex(32),
  ShaThree256: $.FixedHex(32),
});

export type DataRaw = $.Output<typeof $DataRaw>;

export type Data =
  | { type: 'None' }
  | { type: 'Raw'; value: string }
  | { type: 'BlakeTwo256'; value: HexString }
  | { type: 'Sha256'; value: HexString }
  | { type: 'Keccak256'; value: HexString }
  | { type: 'ShaThree256'; value: HexString };

export const $Data: $.Shape<Data, Data> = $.transform({
  $base: $DataRaw,
  encode: (input): $.Input<typeof $DataRaw> => {
    if (input.type === 'Raw') {
      const bytes = stringToU8a(input.value);

      return {
        type: `Raw${bytes.length}`,
        value: input.value,
      } as DataRaw;
    }

    return input;
  },
  decode: (input): Data => {
    if (input.type.startsWith('Raw')) {
      return {
        type: 'Raw',
        // @ts-ignore
        value: input.value,
      } as Data;
    }

    return input as Data;
  },
});
