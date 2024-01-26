/**
 * Return the bigger bigint value
 */
export function max(a: bigint, b: bigint) {
  return a > b ? a : b;
}

/**
 * Return the smaller bigint value
 */
export function min(a: bigint, b: bigint) {
  return a > b ? b : a;
}

/**
 * Returns the number of trailing zeros in the binary representation of `n`.
 *
 * @param n
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
 *
 * @param n
 */
export function nextPowerOfTwo(n: bigint) {
  let p = 1n;
  while (n > p) p <<= 1n; // p *= 2n

  return p;
}
