import { concatU8a } from '../concat.js';
import { blake2AsU8a } from './blake2.js';
import { keccakAsU8a } from './keccak.js';
import { xxhashAsU8a } from './xxhash.js';

export type HashFn = (data: Uint8Array) => Uint8Array;
export const blake2_128: HashFn = (data: Uint8Array) => blake2AsU8a(data, 128);
export const blake2_256: HashFn = (data: Uint8Array) => blake2AsU8a(data, 256);
export const blake2_128Concat: HashFn = (data: Uint8Array) => concatU8a(blake2AsU8a(data, 128), data);
export const keccak_256: HashFn = (data: Uint8Array) => keccakAsU8a(data, 256);
export const twox128: HashFn = (data: Uint8Array) => xxhashAsU8a(data, 128);
export const twox256: HashFn = (data: Uint8Array) => xxhashAsU8a(data, 256);
export const twox64Concat: HashFn = (data: Uint8Array) => concatU8a(xxhashAsU8a(data, 64), data);
export const identity: HashFn = (data: Uint8Array) => data;

export const HASHERS: Record<string, HashFn> = {
  blake2_128,
  blake2_256,
  blake2_128Concat,
  keccak_256,
  twox128,
  twox256,
  twox64Concat,
  identity,
};
