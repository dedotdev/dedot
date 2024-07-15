import { $Data, $DataRaw, Data, DataRaw } from '@dedot/codecs';
import { blake2AsHex, keccakAsHex } from '@dedot/utils';
import { describe, expect, it } from 'vitest';

describe('identity', () => {
  describe('Data', () => {
    it('should encode to raw data', () => {
      const data: Data[] = [
        { type: 'None' },
        { type: 'Raw', value: '1' },
        { type: 'Raw', value: '12' },
        { type: 'Raw', value: '1234' },
        { type: 'Raw', value: '123456' },
        { type: 'Raw', value: '12345678' },
        { type: 'BlakeTwo256', value: blake2AsHex('Dedot', 256) },
        { type: 'Keccak256', value: keccakAsHex('Dedot', 256) },
      ];

      const expected: DataRaw[] = [
        { type: 'None' },
        { type: 'Raw1', value: '1' },
        { type: 'Raw2', value: '12' },
        { type: 'Raw4', value: '1234' },
        { type: 'Raw6', value: '123456' },
        { type: 'Raw8', value: '12345678' },
        { type: 'BlakeTwo256', value: blake2AsHex('Dedot', 256) },
        { type: 'Keccak256', value: keccakAsHex('Dedot', 256) },
      ];

      const encoded = data.map((one) => $Data.tryEncode(one));
      expect(encoded.map((one) => $DataRaw.tryDecode(one))).toEqual(expected);
    });

    it('should decode from raw data', () => {
      const raw: DataRaw[] = [
        { type: 'None' },
        { type: 'Raw1', value: '1' },
        { type: 'Raw2', value: '12' },
        { type: 'Raw4', value: '1234' },
        { type: 'Raw6', value: '123456' },
        { type: 'Raw8', value: '12345678' },
        { type: 'BlakeTwo256', value: blake2AsHex('Dedot', 256) },
        { type: 'Keccak256', value: keccakAsHex('Dedot', 256) },
      ];

      const expected: Data[] = [
        { type: 'None' },
        { type: 'Raw', value: '1' },
        { type: 'Raw', value: '12' },
        { type: 'Raw', value: '1234' },
        { type: 'Raw', value: '123456' },
        { type: 'Raw', value: '12345678' },
        { type: 'BlakeTwo256', value: blake2AsHex('Dedot', 256) },
        { type: 'Keccak256', value: keccakAsHex('Dedot', 256) },
      ];

      const encoded = raw.map((one) => $DataRaw.tryEncode(one));
      expect(encoded.map((one) => $Data.tryDecode(one))).toEqual(expected);
    });
  });
});
