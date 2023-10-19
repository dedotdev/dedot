import * as $ from "@delightfuldot/shape";
import { hexToU8a, isHex, isString } from "@polkadot/util";
import { decodeAddress, isEthereumAddress } from "@polkadot/util-crypto";

export const $AccountId32 = $.FixedHex(32);
$AccountId32.registerEncoder(isString, ($shape, input) => decodeAddress(input));
export type AccountId32 = $.Output<typeof $AccountId32>;

export const $AccountId20 = $.FixedHex(20);
$AccountId20.registerEncoder(
  (input) => isHex(input) || isEthereumAddress(input),
  ($shape, input) => hexToU8a(input),
);
export type AccountId20 = $.Output<typeof $AccountId20>;
