import * as $ from '@dedot/shape';
import { bnMax, bnMin } from '@dedot/utils';

/**
 * Returns the number of trailing zeros in the binary representation of `n`.
 */
export function numOfTrailingZeroes(n: bigint) {
  let i = 0n;
  while (!(n & 1n)) {
    i++;
    n >>= 1n; // /2n
  }
  return i;
}

/**
 * Returns the smallest power of two greater than or equal to n.
 */
export function nextPowerOfTwo(n: bigint) {
  let p = 1n;
  while (n > p) p <<= 1n; // p *= 2n

  return p;
}

/**
 * @description An era codec to describe the longevity of a transaction.
 */
export const $Era: $.Shape<EraLike, Era> = $.createShape({
  metadata: $.metadata('$Era'),
  staticSize: 2,
  subEncode(buffer: $.EncodeBuffer, input: EraLike): void {
    if (input.hasOwnProperty('period') && input.hasOwnProperty('current')) {
      input = input as MortalInputs;

      // Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/runtime/src/generic/era.rs#L65-L72
      const adjustedPeriod = bnMin(bnMax(nextPowerOfTwo(input.period), 4n), 1n << 16n);
      const phase = input.current % adjustedPeriod;
      const quantizeFactor = bnMax(adjustedPeriod >> 12n, 1n);
      const quantizedPhase = (phase / quantizeFactor) * quantizeFactor;
      input = { type: 'Mortal', value: { period: adjustedPeriod, phase: quantizedPhase } };
    }

    if (input.hasOwnProperty('type')) {
      input = input as Era;

      // Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/runtime/src/generic/era.rs#L104-L112
      if (input.type === 'Immortal') {
        buffer.array[buffer.index++] = 0;
      } else if (input.type === 'Mortal') {
        const quantizeFactor = bnMax(input.value.period >> 12n, 1n);
        const encoded =
          bnMin(bnMax(numOfTrailingZeroes(input.value.period) - 1n, 1n), 15n) |
          ((input.value.phase / quantizeFactor) << 4n);
        $.u16.subEncode(buffer, Number(encoded));
      }
    }
  },
  subDecode(buffer: $.DecodeBuffer): Era {
    // Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/runtime/src/generic/era.rs#L119-L134
    if (buffer.array[buffer.index] === 0) {
      buffer.index++;
      return { type: 'Immortal' };
    } else {
      const encoded = BigInt(buffer.array[buffer.index] + (buffer.array[buffer.index + 1] << 8));
      buffer.index += 2;

      const period = 2n << encoded % (1n << 4n);
      const quantizeFactor = bnMax(period >> 12n, 1n);
      const phase = (encoded >> 4n) * quantizeFactor;
      if (period >= 4n && phase < period) {
        return { type: 'Mortal', value: { period, phase } };
      } else {
        throw new Error('Invalid period and phase');
      }
    }
  },
});

export type MortalInputs = { period: bigint; current: bigint };
export type Era = { type: 'Immortal' } | { type: 'Mortal'; value: { period: bigint; phase: bigint } };
export type EraLike = Era | MortalInputs;
