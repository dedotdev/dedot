import * as $ from '@dedot/shape';

export const $Percent = $.u8; // 0 -> 100u8
export type Percent = number;

export const $PerU16 = $.u16; // 0 -> 65535_u16
export type PerU16 = number;

export const $Permill = $.u32; // 0 -> 1_000_000u32
export type Permill = number;

export const $Perbill = $.u32; // 0 -> 1_000_000_000u32
export type Perbill = number;

export const $Perquintill = $.u64; // 0 -> 1_000_000_000_000_000_000u64
export type Perquintill = bigint;

export const $FixedI64 = $.i64;
export type FixedI64 = bigint;

export const $FixedU64 = $.u64;
export type FixedU64 = bigint;

export const $FixedI128 = $.i128;
export type FixedI128 = bigint;

export const $FixedU128 = $.u128;
export type FixedU128 = bigint;
