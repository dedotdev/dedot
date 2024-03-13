import { hexToU8a, isHex, stringCamelCase } from '@polkadot/util';
import { HexString } from './types.js';

export const shortenAddress = (address: string): string => {
  if (!address) {
    return '';
  }

  const length = address.length;
  if (length <= 15) {
    return address;
  }

  return `${address.substring(0, 6)}...${address.substring(length - 6, length)}`;
};

export const trimOffUrlProtocol = (url: string): string => {
  return url.replace(/https?:\/\//, '');
};

export const trimTrailingSlash = (input: string): string => {
  return input.endsWith('/') ? trimTrailingSlash(input.slice(0, -1)) : input;
};

/**
 * Remove special characters
 */
export function normalizeName(ident: string) {
  return stringCamelCase(ident.replace('#', '_'));
}

const TS_PRIMITIVE_TYPES = [
  'void',
  'undefined',
  'null',
  'number',
  'boolean',
  'bigint',
  'Map',
  'Set',
  'string',
  'any',
  'Array',
  'Record',
];

/**
 * Check if a type is native JS/TS type
 * @param type
 */
export const isNativeType = (type: string) => {
  return TS_PRIMITIVE_TYPES.some((one) => {
    if (typeof one === 'string') {
      return one === type;
    } else {
      return type.match(one);
    }
  });
};

export const stringSnakeCase = (input?: string | undefined) => {
  if (!input) return '';
  return stringCamelCase(input).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Check if a hash is zero
 * - isZeroHash('0x000000') returns `true`
 * - isZeroHash('0x000001') returns `false`
 * @param input
 */
export const isZeroHash = (input: HexString): boolean => {
  return isHex(input) && hexToU8a(input).every((b) => b === 0);
};
