import { Expand } from '@delightfuldot/shape';

// @TODO include credit
export type SerdeResult<O, E> = SerdeEnum<{ Ok: O; Err: E }>;

export type SerdeEnum<T> = {
  [K in keyof T]: T[K] extends void ? K : Expand<Pick<T, K> & Omit<{ [K in keyof T]?: never }, K>>;
}[keyof T];
