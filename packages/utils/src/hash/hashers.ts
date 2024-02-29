import { blake2AsU8a } from './blake2';
import { xxhashAsU8a } from './xxhash';
import { u8aConcat, u8aToU8a } from '@polkadot/util';

export type HasherInput = string | Uint8Array;

export const HASHERS = {
  blake2_128: (data: HasherInput) => blake2AsU8a(data, 128),
  blake2_256: (data: HasherInput) => blake2AsU8a(data, 256),
  blake2_128Concat: (data: HasherInput) => u8aConcat(blake2AsU8a(data, 128), u8aToU8a(data)),
  twox128: (data: HasherInput) => xxhashAsU8a(data, 128),
  twox256: (data: HasherInput) => xxhashAsU8a(data, 256),
  twox64Concat: (data: HasherInput) => u8aConcat(xxhashAsU8a(data, 64), u8aToU8a(data)),
  identity: (data: HasherInput) => u8aToU8a(data),
};
