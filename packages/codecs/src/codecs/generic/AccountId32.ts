import { isHex, isString, isU8a, u8aToHex } from '@polkadot/util';
import * as $ from '@dedot/shape';
import { decodeAddress, encodeAddress, HexString } from '@dedot/utils';

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

  address(ss58Format?: number) {
    return encodeAddress(this.raw, ss58Format);
  }

  toJSON() {
    return this.address();
  }
}

export type AccountId32Like = AccountId32 | string | HexString | Uint8Array;

export const $AccountId32: $.Shape<AccountId32Like, AccountId32> = $.instance(
  AccountId32,
  $.Tuple($.FixedHex(32)),
  (input) => [accountId32ToHex(input)],
);
