import { describe, expect, it } from 'vitest';
import { xxhashAsU8a, xxhashAsHex } from '../xxhash';
import { hexToU8a } from '@polkadot/util';

describe('xxhash', () => {
  it.each<{ input: [any, any]; output: string }>([
    { input: ['abc', undefined], output: '0x990977adf52cbc44' },
    { input: ['abc', 64], output: '0x990977adf52cbc44' },
    { input: ['abc', 128], output: '0x990977adf52cbc440889329981caa9be' },
    {
      input: ['abc', 256],
      output: '0x990977adf52cbc440889329981caa9bef7da5770b2b8a05303b75d95360dd62b',
    },
  ])('should return correct hash with input: $input', ({ input, output }) => {
    expect(xxhashAsHex(...input)).toEqual(output);
    expect(xxhashAsU8a(...input)).toEqual(hexToU8a(output));
  });
});
