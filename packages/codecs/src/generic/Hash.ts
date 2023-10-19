import * as $ from '@delightfuldot/shape';

export const $Hash = $.FixedHex(32);

export const $BlockHash = $Hash;
export type BlockHash = $.Output<typeof $BlockHash>;
