import { concatBytes } from '@noble/hashes/utils';

/**
 * Concat multiple Uint8Array instances into a single Uint8Array.
 *
 * @param {...Uint8Array[]} args - The Uint8Array instances to be concatenated.
 * @returns {Uint8Array} The concatenated Uint8Array.
 */
export function concatU8a(...args: Uint8Array[]): Uint8Array {
  return concatBytes(...args);
}

// TODO concatHex
