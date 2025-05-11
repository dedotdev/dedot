import { notSupportedCodec } from '@dedot/codecs';
import * as $ from '@dedot/shape';

export const $TypeRef = $.Enum({
  bool: null,
  char: null,
  str: null,
  u8: null,
  u16: null,
  u32: null,
  u64: null,
  u128: null,
  u256: null,
  i8: null,
  i16: null,
  i32: null,
  i64: null,
  i128: null,
  i256: null,
  compactU8: null,
  compactU16: null,
  compactU32: null,
  compactU64: null,
  compactU128: null,
  compactU256: null,
  void: null,
  perId: $.compactU32,
});

export type TypeRef = $.Input<typeof $TypeRef>;

/**
 * Field in a composite or enumeration type
 */
export const $Field = $.Struct({
  name: $.Option($.str),
  typeRef: $TypeRef,
  typeName: $.Option($.str),
});

export type Field = $.Input<typeof $Field>;

/**
 * Array type definition
 */
export const $TypeDefArray = $.Struct({
  len: $.u32,
  typeParam: $TypeRef,
});

export type TypeDefArray = $.Input<typeof $TypeDefArray>;

/**
 * Bit sequence type definition
 */
export const $TypeDefBitSequence = $.Struct({
  numBytes: $.u8,
  leastSignificantBitFirst: $.bool,
});

export type TypeDefBitSequence = $.Input<typeof $TypeDefBitSequence>;

/**
 * Enumeration variant
 */
export const $EnumerationVariant = $.Struct({
  name: $.str,
  fields: $.Vec($Field),
  index: $.compactU32,
});

export type EnumerationVariant = $.Input<typeof $EnumerationVariant>;

/**
 * Type definition as defined in RFC-0078
 */
export const $TypeDef = $.Enum({
  composite: $.Vec($Field),
  enumeration: $EnumerationVariant,
  sequence: $TypeRef,
  array: $TypeDefArray,
  tuple: $.Vec($TypeRef),
  bitSequence: $TypeDefBitSequence,
});

export type TypeDef = $.Input<typeof $TypeDef>;

/**
 * Type information as defined in RFC-0078
 */
export const $TypeInfo = $.Struct({
  path: $.Vec($.str),
  typeDef: $TypeDef,
  typeId: $.compactU32,
});

export type TypeInfo = $.Input<typeof $TypeInfo>;

/**
 * Signed extension metadata as defined in RFC-0078
 */
export const $SignedExtensionMetadata = $.Struct({
  identifier: $.str,
  includedInExtrinsic: $TypeRef,
  includedInSignedData: $TypeRef,
});

export type SignedExtensionMetadata = $.Input<typeof $SignedExtensionMetadata>;

/**
 * Extrinsic metadata as defined in RFC-0078
 */
export const $ExtrinsicMetadata = $.Struct({
  version: $.u8,
  addressTypeId: $TypeRef,
  callTypeId: $TypeRef,
  signatureTypeId: $TypeRef,
  signedExtensions: $.Vec($SignedExtensionMetadata),
});

export type ExtrinsicMetadata = $.Input<typeof $ExtrinsicMetadata>;

export const $ChainInfo = $.Struct({
  specVersion: $.u32,
  specName: $.str,
  ss58Prefix: $.u16,
  decimals: $.u8,
  tokenSymbol: $.str,
});

/**
 * Metadata digest structure as defined in RFC-0078
 */
export const $MetadataDigest = $.Enum({
  V0: notSupportedCodec('Not supported!'),
  V1: $.Struct({
    typeInformationTreeRoot: $.FixedHex(32),
    extrinsicMetadataHash: $.FixedHex(32),
    chainInfo: $ChainInfo,
  }),
});

export type MetadataDigest = $.Input<typeof $MetadataDigest>;

export const $Proof = $.Struct({
  leaves: $.Vec($.sizedUint8Array(32)),
  leafIndices: $.Vec($.u32),
  proofs: $.Vec($.sizedUint8Array(32)),
  extrinsicMetadata: $ExtrinsicMetadata,
  chainInfo: $ChainInfo,
});
