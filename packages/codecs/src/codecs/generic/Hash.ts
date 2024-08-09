import * as $ from '@dedot/shape';
import { HexString } from '@dedot/utils';

export const $Hash = $.FixedHex(32);
export type Hash = $.Input<typeof $Hash>;
export type HashLike = string | HexString | Uint8Array;

export const $BlockHash = $Hash;
export type BlockHash = $.Input<typeof $BlockHash>;
