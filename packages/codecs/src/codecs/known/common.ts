import * as $ from '@dedot/shape';
import { HexString } from '@dedot/utils';
import { registerLooseCodecType } from '../codectypes';
import { isString, isU8a, stringToHex, u8aToHex } from '@polkadot/util';

export const $Text = $.str;
export type Text = string;

export const $StorageKey = $.RawHex;
export type StorageKeyLike = $.Input<typeof $StorageKey>;
export type StorageKey = $.Output<typeof $StorageKey>;

export const $PrefixedStorageKey = $.RawHex;
export type PrefixedStorageKeyLike = $.Input<typeof $PrefixedStorageKey>;
export type PrefixedStorageKey = $.Output<typeof $PrefixedStorageKey>;

export const $StorageData = $.RawHex;
export type StorageDataLike = $.Input<typeof $StorageData>;
export type StorageData = $.Output<typeof $StorageData>;

registerLooseCodecType({ $StorageKey, $StorageData, $PrefixedStorageKey });

export type RawBytesLike = HexString | Uint8Array;
export type RawBytes = HexString;
export const $RawBytes: $.Shape<RawBytesLike, RawBytes> = $.transform({
  $base: $.RawHex,
  encode: (value) => (isU8a(value) ? u8aToHex(value) : value),
  decode: (value) => value,
});

export type BytesLike = HexString | string | Uint8Array;
export type Bytes = HexString;
export const $Bytes: $.Shape<BytesLike, Bytes> = $.transform({
  $base: $.PrefixedHex,
  encode: (value) => {
    if (isString(value)) {
      return stringToHex(value);
    } else if (isU8a(value)) {
      return u8aToHex(value);
    }

    return value;
  },
  decode: (value) => value,
});

registerLooseCodecType({ $Bytes, $RawBytes });

export type FixedBytes<Bytes extends number> = HexString; // TODO: add Unit8Array

export type BitSequence = $.BitSequence;

// credit: https://mstn.github.io/2018/06/08/fixed-size-arrays-in-typescript/
export type FixedArray<T, N extends number> = N extends 0
  ? never[]
  : {
      0: T;
      length: N;
    } & ReadonlyArray<T>;

// typeIn for $.Option codec
export type Option<T> = T | undefined;

export type Result<Ok, Err> = $.Result<Ok, Err>;

export type u8 = number;
export type u16 = number;
export type u32 = number;
export type u64 = bigint;
export type u128 = bigint;
export type u256 = bigint;
export type i8 = number;
export type i16 = number;
export type i32 = number;
export type i64 = bigint;
export type i128 = bigint;
export type i256 = bigint;
export type str = string;
export type bool = boolean;
export type Null = null;
