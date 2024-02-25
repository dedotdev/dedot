import { literalUnion, sizedArray, sizedUint8Array, tuple, uint8Array } from 'subshape';
import { array, option } from '../extension';

export * from './Struct';
export * from './Enum';

export const FlatEnum = literalUnion;

export const Option = option;
export const Tuple = tuple;
export const Vec = array;
export const Array = array;
export const SizedVec = sizedArray;
export const U8a = uint8Array;
export const SizedU8a = sizedUint8Array;
