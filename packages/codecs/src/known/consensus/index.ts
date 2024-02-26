import * as $ from '@dedot/shape';

export * from './babe';
export * from './beefy';
export * from './grandpa';

/*
 * An opaque type used to represent the key ownership proof at the runtime API
 * boundary. The inner value is an encoded representation of the actual key
 * ownership proof which will be parameterized when defining the runtime. At
 * the runtime API boundary this type is unknown and as such we keep this
 * opaque representation, implementors of the runtime API will have to make
 * sure that all usages of `OpaqueKeyOwnershipProof` refer to the same type.
 */
export const $OpaqueKeyOwnershipProof = $.PrefixedHex;

export type OpaqueKeyOwnershipProof = $.Input<typeof $OpaqueKeyOwnershipProof>;
