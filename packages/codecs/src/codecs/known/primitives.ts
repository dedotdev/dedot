import * as $ from '@dedot/shape';

export const $U128 = $.u128;
export type U128 = $.Input<typeof $U128>; // bigint

export const $U256 = $.u256;
export type U256 = $.Input<typeof $U256>; // bigint

// TODO to implement!
// export const $U512 = ?!?

export const $H128 = $.FixedHex(16);
export type H128 = $.Input<typeof $H128>;

export const $H160 = $.FixedHex(20);
export type H160 = $.Input<typeof $H160>;

export const $H256 = $.FixedHex(32);
export type H256 = $.Input<typeof $H256>;

export const $H384 = $.FixedHex(48);
export type H384 = $.Input<typeof $H384>;

export const $H512 = $.FixedHex(64);
export type H512 = $.Input<typeof $H512>;

export const $H768 = $.FixedHex(96);
export type H768 = $.Input<typeof $H768>;
