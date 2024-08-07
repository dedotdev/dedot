import { describe, expect, it } from 'vitest';
import { $Era, nextPowerOfTwo, numOfTrailingZeroes } from '../Era.js';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/runtime/src/generic/era.rs#L182-L232
 */
describe('Era', () => {
  it('immortal should work', () => {
    const e = $Era.tryEncode({ type: 'Immortal' });
    expect(e).toEqual(new Uint8Array([0]));
    expect($Era.tryDecode(e)).toEqual({ type: 'Immortal' });
  });
  it.each([
    { input: { period: 64n, current: 42n }, expected: { type: 'Mortal', value: { period: 64n, phase: 42n } } },
    {
      input: { period: 32768n, current: 20000n },
      expected: { type: 'Mortal', value: { period: 32768n, phase: 20000n } },
    },
    { input: { period: 200n, current: 513n }, expected: { type: 'Mortal', value: { period: 256n, phase: 1n } } },
    { input: { period: 2n, current: 1n }, expected: { type: 'Mortal', value: { period: 4n, phase: 1n } } },
    { input: { period: 4n, current: 5n }, expected: { type: 'Mortal', value: { period: 4n, phase: 1n } } },
    {
      input: { period: 1000000n, current: 1000001n },
      expected: { type: 'Mortal', value: { period: 65536n, phase: BigInt(((1000001 % 65536) / 4) * 4) } },
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
    expect($Era.tryDecode(e)).toEqual({ type: 'Mortal', value: { period: 64n, phase: 42n } });
  });

  it('long period mortal codec should work ', () => {
    const e = $Era.tryEncode({ period: 32768n, current: 20000n });
    expect(e).toEqual(new Uint8Array([14 + (2500 % 16) * 16, 2500 / 16]));
    expect($Era.tryDecode(e)).toEqual({ type: 'Mortal', value: { period: 32768n, phase: 20000n } });
  });
});

describe('nextPowerOfTwo', () => {
  it('should return next power of two', () => {
    expect(nextPowerOfTwo(2n)).toEqual(2n);
    expect(nextPowerOfTwo(3n)).toEqual(4n);
    expect(nextPowerOfTwo(4n)).toEqual(4n);
    expect(nextPowerOfTwo(5n)).toEqual(8n);
    expect(nextPowerOfTwo(10n)).toEqual(16n);
    expect(nextPowerOfTwo(16n)).toEqual(16n);
    expect(nextPowerOfTwo(20n)).toEqual(32n);
  });
});
describe('numOfTrailingZeroes', () => {
  it('should return number of trailing zeros', () => {
    expect(numOfTrailingZeroes(1n)).toEqual(0n); // 0b1
    expect(numOfTrailingZeroes(2n)).toEqual(1n); // 0b10
    expect(numOfTrailingZeroes(3n)).toEqual(0n); // 0b11
    expect(numOfTrailingZeroes(4n)).toEqual(2n); // 0b100
    expect(numOfTrailingZeroes(10n)).toEqual(1n); // 0b1010
  });
});
