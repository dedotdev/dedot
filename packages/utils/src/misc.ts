import { blake2AsHex } from './hash';
import { HexString } from './types';
import { hexToU8a, isHex, isString, isU8a, stringToHex, stringToU8a, u8aToHex } from '@polkadot/util';

export const calculateRuntimeApiHash = (runtimeApiName: string) => {
  return blake2AsHex(runtimeApiName, 64);
};

export const xToHex = (input: HexString | string | Uint8Array): HexString => {
  if (isHex(input)) {
    return input;
  } else if (isString(input)) {
    return stringToHex(input);
  } else if (isU8a(input)) {
    return u8aToHex(input);
  }

  return input;
};

export const xToU8a = (input: HexString | string | Uint8Array): Uint8Array => {
  if (isHex(input)) {
    return hexToU8a(input);
  } else if (isString(input)) {
    return stringToU8a(input);
  }

  return input;
};
