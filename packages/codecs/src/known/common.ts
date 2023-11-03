import * as $ from '@delightfuldot/shape';
import { HexString } from '@delightfuldot/utils';
import { registerCodecType } from '../codectypes';
import { $ConsensusEngineId } from '@delightfuldot/codecs/generic';

export const $Text = $.str;

export const $StorageKey = $.RawHex;
export type StorageKeyLike = $.Input<typeof $StorageKey>;
export type StorageKey = $.Output<typeof $StorageKey>;

$StorageKey.registerType('StorageKeyLike');

export const $StorageData = $.RawHex;
export type StorageDataLike = $.Input<typeof $StorageData>;
export type StorageData = $.Output<typeof $StorageData>;

$StorageData.registerType('StorageDataLike');

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

// typeIn for $.Option codec
export type Option<T> = T | undefined;

// TODO add typeIn for other primitives codecs!
