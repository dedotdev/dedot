import { blake2AsU8a } from './blake2.js';
import { xxhashAsU8a } from './xxhash.js';
import { concatU8a } from '../concat.js';

export const HASHERS: Record<string, (data: Uint8Array) => Uint8Array> = {
  blake2_128: (data: Uint8Array) => blake2AsU8a(data, 128),
  blake2_256: (data: Uint8Array) => blake2AsU8a(data, 256),
  blake2_128Concat: (data: Uint8Array) => concatU8a(blake2AsU8a(data, 128), data),
  twox128: (data: Uint8Array) => xxhashAsU8a(data, 128),
  twox256: (data: Uint8Array) => xxhashAsU8a(data, 256),
  twox64Concat: (data: Uint8Array) => concatU8a(xxhashAsU8a(data, 64), data),
  identity: (data: Uint8Array) => data,
};
