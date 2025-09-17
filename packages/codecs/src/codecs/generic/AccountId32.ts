import * as $ from '@dedot/shape';
import {
  decodeAddress,
  encodeAddress,
  HexString,
  SS58FormatPrefix,
  isHex,
  isString,
  isU8a,
  isZeroHex,
  u8aToHex,
} from '@dedot/utils';

export const accountId32ToHex = (input: AccountId32Like): HexString => {
  if (input instanceof AccountId32) {
    return input.raw;
  } else if (isU8a(input)) {
    return u8aToHex(input);
  } else if (isString(input)) {
    return u8aToHex(decodeAddress(input));
  } else if (isHex(input)) {
    return input;
  }

  throw Error(`Invalid input for AccountId32: ${input}`);
};

export class AccountId32 {
  raw: HexString;

  constructor(input: AccountId32Like) {
    this.raw = accountId32ToHex(input);
  }

  address(ss58Format?: SS58FormatPrefix) {
    return encodeAddress(this.raw, ss58Format);
  }

  isZero() {
    return isZeroHex(this.raw);
  }

  toJSON() {
    return this.address();
  }

  eq(other: AccountId32Like): boolean {
    return this.raw === new AccountId32(other).raw;
  }
}

export type AccountId32Like = AccountId32 | string | HexString | Uint8Array;

export const $AccountId32: $.Shape<AccountId32Like, AccountId32> = $.instance(
  AccountId32,
  $.Tuple($.FixedHex(32)),
  (input) => [accountId32ToHex(input)],
);
