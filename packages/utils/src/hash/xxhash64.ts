// Copyright 2017-2024 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Original implementation: https://github.com/polkadot-js/common/blob/22aab4a4e62944a2cf8c885f50be2c1b842813ec/packages/util-crypto/src/xxhash/xxhash64.ts
// Adapted from https://github.com/pierrec/js-xxhash/blob/0504e76f3d31a21ae8528a7f590c7289c9e431d2/lib/xxhash64.js
//
// xxHash64 implementation in pure Javascript
// Copyright (C) 2016, Pierre Curto
// MIT license
//
// Changes made:
//   - converted to TypeScript
//   - uses native JS BigInt (no external dependencies)
//   - support only for Uint8Array inputs
//   - no constructor function, straight fill & digest
//   - update code removed, only called once, no streams
//   - inline single-use functions

interface State {
  seed: bigint;
  u8a: Uint8Array;
  u8asize: number;
  v1: bigint;
  v2: bigint;
  v3: bigint;
  v4: bigint;
}

const P64_1 = 11400714785074694791n;
const P64_2 = 14029467366897019727n;
const P64_3 = 1609587929392839161n;
const P64_4 = 9650029242287828579n;
const P64_5 = 2870177450012600261n;

// mask for a u64, all bits set
const U64 = BigInt('0xffffffffffffffff');

// various constants
const _0n = 0n;
const _1n = 1n;
const _7n = 7n;
const _11n = 11n;
const _12n = 12n;
const _16n = 16n;
const _18n = 18n;
const _23n = 23n;
const _27n = 27n;
const _29n = 29n;
const _31n = 31n;
const _32n = 32n;
const _33n = 33n;
const _64n = 64n;
const _256n = 256n;

function rotl(a: bigint, b: bigint): bigint {
  const c = a & U64;

  return ((c << b) | (c >> (_64n - b))) & U64;
}

function fromU8a(u8a: Uint8Array, p: number, count: 2 | 4): bigint {
  const bigints = new Array<bigint>(count);
  let offset = 0;

  for (let i = 0; i < count; i++, offset += 2) {
    bigints[i] = BigInt(u8a[p + offset] | (u8a[p + 1 + offset] << 8));
  }

  let result = _0n;

  for (let i = count - 1; i >= 0; i--) {
    result = (result << _16n) + bigints[i];
  }

  return result;
}

function init(seed: bigint, input: Uint8Array): State {
  const state = {
    seed,
    u8a: new Uint8Array(32),
    u8asize: 0,
    v1: seed + P64_1 + P64_2,
    v2: seed + P64_2,
    v3: seed,
    v4: seed - P64_1,
  };

  if (input.length < 32) {
    state.u8a.set(input);
    state.u8asize = input.length;

    return state;
  }

  const limit = input.length - 32;
  let p = 0;

  if (limit >= 0) {
    const adjustV = (v: bigint) => P64_1 * rotl(v + P64_2 * fromU8a(input, p, 4), _31n);

    do {
      state.v1 = adjustV(state.v1);
      p += 8;
      state.v2 = adjustV(state.v2);
      p += 8;
      state.v3 = adjustV(state.v3);
      p += 8;
      state.v4 = adjustV(state.v4);
      p += 8;
    } while (p <= limit);
  }

  if (p < input.length) {
    state.u8a.set(input.subarray(p, input.length));
    state.u8asize = input.length - p;
  }

  return state;
}

export function xxhash64(input: Uint8Array, initSeed: bigint | number): Uint8Array {
  const { seed, u8a, u8asize, v1, v2, v3, v4 } = init(BigInt(initSeed), input);
  let p = 0;
  let h64 =
    U64 &
    (BigInt(input.length) +
      (input.length >= 32
        ? ((((((((rotl(v1, _1n) + rotl(v2, _7n) + rotl(v3, _12n) + rotl(v4, _18n)) ^ (P64_1 * rotl(v1 * P64_2, _31n))) *
            P64_1 +
            P64_4) ^
            (P64_1 * rotl(v2 * P64_2, _31n))) *
            P64_1 +
            P64_4) ^
            (P64_1 * rotl(v3 * P64_2, _31n))) *
            P64_1 +
            P64_4) ^
            (P64_1 * rotl(v4 * P64_2, _31n))) *
            P64_1 +
          P64_4
        : seed + P64_5));

  while (p <= u8asize - 8) {
    h64 = U64 & (P64_4 + P64_1 * rotl(h64 ^ (P64_1 * rotl(P64_2 * fromU8a(u8a, p, 4), _31n)), _27n));
    p += 8;
  }

  if (p + 4 <= u8asize) {
    h64 = U64 & (P64_3 + P64_2 * rotl(h64 ^ (P64_1 * fromU8a(u8a, p, 2)), _23n));
    p += 4;
  }

  while (p < u8asize) {
    h64 = U64 & (P64_1 * rotl(h64 ^ (P64_5 * BigInt(u8a[p++])), _11n));
  }

  h64 = U64 & (P64_2 * (h64 ^ (h64 >> _33n)));
  h64 = U64 & (P64_3 * (h64 ^ (h64 >> _29n)));
  h64 = U64 & (h64 ^ (h64 >> _32n));

  const result = new Uint8Array(8);

  for (let i = 7; i >= 0; i--) {
    result[i] = Number(h64 % _256n);

    h64 = h64 / _256n;
  }

  return result;
}
