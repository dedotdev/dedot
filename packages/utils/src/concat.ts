import { concatBytes } from '@noble/hashes/utils';

export function concatU8a(...args: Uint8Array[]): Uint8Array {
  return concatBytes(...args);
}

// TODO concatHex
