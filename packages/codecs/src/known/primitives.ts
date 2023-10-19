import * as $ from '@delightfuldot/shape';

export const $U128 = $.u128;
export type U128 = $.Output<typeof $U128>; // bigint

export const $U256 = $.u256;
export type U256 = $.Output<typeof $U256>; // bigint

// TODO to implement!
// export const $U512 = ?!?

export const $H128 = $.FixedHex(16);
export type H128 = $.Output<typeof $H128>;

export const $H160 = $.FixedHex(20);
export type H160 = $.Output<typeof $H160>;

export const $H256 = $.FixedHex(32);
export type H256 = $.Output<typeof $H256>;

export const $H384 = $.FixedHex(48);
export type H384 = $.Output<typeof $H384>;

export const $H512 = $.FixedHex(64);
export type H512 = $.Output<typeof $H512>;

export const $H768 = $.FixedHex(96);
export type H768 = $.Output<typeof $H768>;
