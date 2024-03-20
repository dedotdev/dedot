import { HexString } from './types.js';

export function isNull(input: unknown): input is null {
  return input === null;
}

export function isUndefined(input: unknown): input is undefined {
  return input === undefined || typeof input === 'undefined';
}

export function isString(input: unknown): input is string {
  return typeof input === 'string';
}

export function isBoolean(input: unknown): input is boolean {
  return typeof input === 'boolean';
}

export function isFunction(input: unknown): input is Function {
  return typeof input === 'function';
}

export function isNumber(input: unknown): input is number {
  return typeof input === 'number';
}

export function isBigInt(input: unknown): input is bigint {
  return typeof input === 'bigint';
}

export function isObject<T extends Record<string, any>>(input: unknown): input is T {
  return !!input && typeof input === 'object';
}

export function isU8a(input: unknown): input is Uint8Array {
  return input instanceof Uint8Array;
}

export const HEX_REGEX = /^0x[\da-fA-F]+$/;

/**
 * Checks if the given input is a hex string.
 *
 * @param {unknown} input - The input to be checked.
 * @param {boolean} [strict=false] - If true, the function also checks if the hex is of even length (padded hex).
 * @returns {boolean} Returns true if the input is a hex string, false otherwise.
 */
export function isHex(input: unknown, strict?: boolean): input is HexString {
  return isString(input) && (input === '0x' || HEX_REGEX.test(input)) && (!strict || input.length % 2 === 0);
}
