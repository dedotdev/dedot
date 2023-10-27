import { isHex, isU8a, u8aToHex } from '@polkadot/util';
import { isEthereumAddress } from '@polkadot/util-crypto';
import * as $ from '@delightfuldot/shape';
import { HexString } from '@delightfuldot/utils';

export const accountId20ToHex = (input: AccountId20Like): HexString => {
  if (input instanceof AccountId20) {
    return input.raw;
  } else if (isU8a(input)) {
    return u8aToHex(input);
  } else if (isHex(input) && isEthereumAddress(input)) {
    return input;
  }

  throw Error(`Invalid input for AccountId20: ${input}`);
};

export class AccountId20 {
  raw: HexString;

  constructor(input: AccountId20Like) {
    this.raw = accountId20ToHex(input);
  }

  address() {
    return this.raw;
  }

  toJSON() {
    return this.address();
  }
}

export type AccountId20Like = AccountId20 | HexString | Uint8Array;

export const $AccountId20: $.Shape<AccountId20Like, AccountId20> = $.instance(
  AccountId20,
  $.Tuple($.FixedHex(20)),
  (input) => [accountId20ToHex(input)],
);
