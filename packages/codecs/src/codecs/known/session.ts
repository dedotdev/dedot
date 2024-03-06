import * as $ from '@dedot/shape';

/**
 * An identifier for a type of cryptographic key.
 *
 * To avoid clashes with other modules when distributing your module publicly, register your
 * `KeyTypeId` on the list here by making a PR.
 *
 * Values whose first character is `_` are reserved for private use and won't conflict with any
 * public modules.
 */
export const $KeyTypeId = $.FixedHex(4);

export type KeyTypeId = $.Input<typeof $KeyTypeId>;
