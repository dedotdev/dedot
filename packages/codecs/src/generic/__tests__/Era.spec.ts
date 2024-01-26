import { describe, expect, it } from 'vitest';
import { $Era } from '../Era';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/runtime/src/generic/era.rs#L182-L232
 */
describe('Era', () => {
  it('immortal should work', () => {
    const e = $Era.tryEncode({ tag: 'Immortal' });
    expect(e).toEqual(new Uint8Array([0]));
    expect($Era.tryDecode(e)).toEqual({ tag: 'Immortal' });
  });
  it.each([
    { input: { period: 64n, current: 42n }, expected: { tag: 'Mortal', value: { period: 64n, phase: 42n } } },
    {
      input: { period: 32768n, current: 20000n },
      expected: { tag: 'Mortal', value: { period: 32768n, phase: 20000n } },
    },
    { input: { period: 200n, current: 513n }, expected: { tag: 'Mortal', value: { period: 256n, phase: 1n } } },
    { input: { period: 2n, current: 1n }, expected: { tag: 'Mortal', value: { period: 4n, phase: 1n } } },
    { input: { period: 4n, current: 5n }, expected: { tag: 'Mortal', value: { period: 4n, phase: 1n } } },
    {
      input: { period: 1000000n, current: 1000001n },
      expected: { tag: 'Mortal', value: { period: 65536n, phase: BigInt(((1000001 % 65536) / 4) * 4) } },
    },
  ])(`should init from MortalInputs: $input`, ({ input, expected }) => {
    const encodedInput = $Era.tryEncode(input);
    const encodedExpected = $Era.tryEncode(input);
    expect(encodedInput).toEqual(encodedExpected);
    expect($Era.tryDecode(encodedInput)).toEqual($Era.tryDecode(encodedExpected));
  });

  it('mortal codec should work', () => {
    const e = $Era.tryEncode({ period: 64n, current: 42n });

    expect(e).toEqual(new Uint8Array([5 + (42 % 16) * 16, 42 / 16]));
    expect($Era.tryDecode(e)).toEqual({ tag: 'Mortal', value: { period: 64n, phase: 42n } });
  });

  it('long period mortal codec should work ', () => {
    const e = $Era.tryEncode({ period: 32768n, current: 20000n });
    expect(e).toEqual(new Uint8Array([14 + (2500 % 16) * 16, 2500 / 16]));
    expect($Era.tryDecode(e)).toEqual({ tag: 'Mortal', value: { period: 32768n, phase: 20000n } });
  });
});
