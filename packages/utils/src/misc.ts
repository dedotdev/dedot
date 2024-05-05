import { blake2AsHex } from './hash/index.js';
import { stringCamelCase } from './string/index.js';
import { HexString } from './types.js';

/**
 * Calculate runtime api hash
 */
export const calcRuntimeApiHash = (runtimeApiName: string): HexString => {
  return blake2AsHex(runtimeApiName, 64);
};

/**
 * Normalize object field's name from metadata
 *
 * Remove special characters (# => _)
 */
export function normalizeName(ident: string): string {
  return stringCamelCase(ident.replace('#', '_'));
}

/**
 * Simply does nothing
 */
export function noop() {}

/**
 * Wait for a certain amount of time in milliseconds
 * @param howLong
 */
export function waitFor(howLong?: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, howLong);
  });
}
