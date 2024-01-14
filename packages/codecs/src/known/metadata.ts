import * as $ from '@delightfuldot/shape';

/*
 * Stores the encoded `RuntimeMetadata` for the native side as opaque type.
 */
export const $OpaqueMetadata = $.Vec($.u8);

export type OpaqueMetadata = $.Input<typeof $OpaqueMetadata>;
