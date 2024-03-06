import { describe, expect, it } from 'vitest';
import { blake2AsHex, blake2AsU8a } from '../blake2';
import { hexToU8a } from '@polkadot/util';

describe('blake2', () => {
  it.each<{ input: [any, any, any]; output: string }>([
    { input: ['abc', 64, null], output: '0xd8bb14d833d59559' },
    { input: ['abc', 128, null], output: '0xcf4ab791c62b8d2b2109c90275287816' },
    { input: ['abc', 128, new Uint8Array([1, 2])], output: '0x36f3d08cda72a00ddf2be103eb5770d9' },
    { input: ['abc', undefined, null], output: '0xbddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319' },
    {
      input: ['abc', 512, null],
      output:
        '0xba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    },
  ])('should return correct hash with input: $input', ({ input, output }) => {
    expect(blake2AsHex(...input)).toEqual(output);
    expect(blake2AsU8a(...input)).toEqual(hexToU8a(output));
  });
});
