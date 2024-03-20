import { HexString } from '../types.js';
import { u8aToHex } from '../u8a.js';

export * from './cases.js';

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

const textEncoder = new TextEncoder();
export function stringToU8a(input: string): Uint8Array {
  return textEncoder.encode(input);
}

export function stringToHex(input: string): HexString {
  return u8aToHex(stringToU8a(input));
}
