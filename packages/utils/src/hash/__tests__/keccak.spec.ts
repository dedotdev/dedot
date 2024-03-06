import { describe, expect, it } from 'vitest';
import { hexToU8a } from '@polkadot/util';
import { keccakAsU8a, keccakAsHex } from '../keccak';

describe('keccak', () => {
  it.each<{ input: [any, any]; output: string }>([
    { input: ['test', 256], output: '0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658' },
    {
      input: ['test', 512],
      output:
        '0x1e2e9fc2002b002d75198b7503210c05a1baac4560916a3c6d93bcce3a50d7f00fd395bf1647b9abb8d1afcc9c76c289b0c9383ba386a956da4b38934417789e',
    },
  ])('should return correct hash with input: $input', ({ input, output }) => {
    expect(keccakAsHex(...input)).toEqual(output);
    expect(keccakAsU8a(...input)).toEqual(hexToU8a(output));
  });
});
