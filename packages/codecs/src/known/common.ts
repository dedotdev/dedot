import * as $ from '@delightfuldot/shape';
import { HexString } from '@delightfuldot/utils';

export const $Text = $.str;

export const $StorageKey = $.RawHex;
export type StorageKey = $.Input<typeof $StorageKey>;

export const $StorageData = $.RawHex;
export type StorageData = $.Input<typeof $StorageData>;

export const $Extrinsic = $.PrefixedHex;

export const $Bytes = $.RawHex;
export type Bytes = HexString;
export type FixedBytes<Bytes extends number> = HexString; // TODO: add Unit8Array

export type BitSequence = $.BitSequence;

// credit: https://mstn.github.io/2018/06/08/fixed-size-arrays-in-typescript/
export type FixedArray<T, N extends number> = N extends 0
  ? never[]
  : {
      0: T;
      length: N;
    } & ReadonlyArray<T>;
