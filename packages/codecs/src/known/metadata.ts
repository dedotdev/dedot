import * as $ from '@dedot/shape';

/*
 * Stores the encoded `RuntimeMetadata` for the native side as opaque type.
 */
export const $OpaqueMetadata = $.PrefixedHex;

export type OpaqueMetadata = $.Input<typeof $OpaqueMetadata>;
