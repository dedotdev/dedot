import { assert } from '@dedot/shape';
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

  describe('subAssert', () => {
    describe('valid MortalInputs format', () => {
      it('should accept valid MortalInputs { period: bigint, current: bigint }', () => {
        expect(() => assert($Era, { period: 64n, current: 42n })).not.toThrow();
      });

      it('should accept MortalInputs with large values', () => {
        expect(() => assert($Era, { period: 32768n, current: 20000n })).not.toThrow();
        expect(() => assert($Era, { period: 1000000n, current: 1000001n })).not.toThrow();
      });

      it('should accept MortalInputs with small values', () => {
        expect(() => assert($Era, { period: 2n, current: 1n })).not.toThrow();
        expect(() => assert($Era, { period: 4n, current: 5n })).not.toThrow();
      });
    });

    describe('valid Era format - Immortal', () => {
      it('should accept valid Immortal era', () => {
        expect(() => assert($Era, { type: 'Immortal' })).not.toThrow();
      });
    });

    describe('valid Era format - Mortal', () => {
      it('should accept valid Mortal era with period and phase', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { period: 64n, phase: 42n } })).not.toThrow();
      });

      it('should accept Mortal era with period=4n, phase=1n', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { period: 4n, phase: 1n } })).not.toThrow();
      });

      it('should accept Mortal era with period=65536n', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { period: 65536n, phase: 100n } })).not.toThrow();
      });
    });

    describe('invalid type errors', () => {
      it('should throw for non-object input', () => {
        expect(() => assert($Era, 'string' as any)).toThrow();
        expect(() => assert($Era, 123 as any)).toThrow();
      });

      it('should throw for null', () => {
        expect(() => assert($Era, null as any)).toThrow();
      });

      it('should throw for array', () => {
        expect(() => assert($Era, [] as any)).toThrow();
      });

      it('should throw for string', () => {
        expect(() => assert($Era, 'invalid' as any)).toThrow();
      });
    });

    describe('invalid MortalInputs errors', () => {
      it('should throw when period is not bigint', () => {
        expect(() => assert($Era, { period: '64' as any, current: 42n })).toThrow();
        expect(() => assert($Era, { period: 64 as any, current: 42n })).toThrow();
      });

      it('should throw when current is not bigint', () => {
        expect(() => assert($Era, { period: 64n, current: '42' as any })).toThrow();
        expect(() => assert($Era, { period: 64n, current: 42 as any })).toThrow();
      });

      it('should throw when period is number instead of bigint', () => {
        expect(() => assert($Era, { period: 100, current: 42n } as any)).toThrow();
      });
    });

    describe('invalid Era format errors', () => {
      it('should throw when type field is missing', () => {
        expect(() => assert($Era, { value: { period: 64n, phase: 42n } } as any)).toThrow();
      });

      it('should throw when type is not string', () => {
        expect(() => assert($Era, { type: 123 as any })).toThrow();
      });

      it('should throw when type is invalid value', () => {
        expect(() => assert($Era, { type: 'Invalid' } as any)).toThrow();
        expect(() => assert($Era, { type: 'mortal' } as any)).toThrow(); // lowercase
      });
    });

    describe('invalid Mortal era errors', () => {
      it('should throw when Mortal era missing value field', () => {
        expect(() => assert($Era, { type: 'Mortal' } as any)).toThrow();
      });

      it('should throw when Mortal value.period is not bigint', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { period: 64 as any, phase: 42n } })).toThrow();
        expect(() => assert($Era, { type: 'Mortal', value: { period: '64' as any, phase: 42n } })).toThrow();
      });

      it('should throw when Mortal value.phase is not bigint', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { period: 64n, phase: 42 as any } })).toThrow();
        expect(() => assert($Era, { type: 'Mortal', value: { period: 64n, phase: '42' as any } })).toThrow();
      });

      it('should throw when Mortal value is null', () => {
        expect(() => assert($Era, { type: 'Mortal', value: null as any })).toThrow();
      });

      it('should throw when Mortal value is missing period', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { phase: 42n } as any })).toThrow();
      });

      it('should throw when Mortal value is missing phase', () => {
        expect(() => assert($Era, { type: 'Mortal', value: { period: 64n } as any })).toThrow();
      });
    });

    describe('invalid format errors', () => {
      it('should throw for empty object {}', () => {
        expect(() => assert($Era, {} as any)).toThrow();
      });

      it('should throw for object with random properties', () => {
        expect(() => assert($Era, { random: 'property' } as any)).toThrow();
      });
    });
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
