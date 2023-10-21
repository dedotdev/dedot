import * as $ from '@delightfuldot/shape';

export const $Hash = $.FixedHex(32);
export type Hash = $.Input<typeof $Hash>;

export const $BlockHash = $Hash;
export type BlockHash = $.Input<typeof $BlockHash>;
