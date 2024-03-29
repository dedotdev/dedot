import * as $ from '@dedot/shape';
import { HexString, isEvmAddress, isHex, isU8a, u8aToHex } from '@dedot/utils';

export const accountId20ToHex = (input: AccountId20Like): HexString => {
  if (input instanceof AccountId20) {
    return input.raw;
  } else if (isU8a(input)) {
    return u8aToHex(input);
  } else if (isHex(input) && isEvmAddress(input)) {
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

export class EthereumAddress extends AccountId20 {}
export type EthereumAddressLike = AccountId20Like;
export const $EthereumAddress: $.Shape<EthereumAddressLike, EthereumAddress> = $AccountId20;
