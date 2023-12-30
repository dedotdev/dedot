import { stringCamelCase } from '@polkadot/util';

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

// TODO docs: Remove special characters
export function normalizeName(ident: string) {
  return stringCamelCase(ident.replace('#', '_'));
}

const JS_PRIMITIVE_TYPES = [
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
  // /^Record<(.+),(.+)>$/,
];

// FIXME rename to isNativeType
export const isJsPrimitive = (type: string) => {
  return JS_PRIMITIVE_TYPES.some((one) => {
    if (typeof one === 'string') {
      return one === type;
    } else {
      return type.match(one);
    }
  });
};
