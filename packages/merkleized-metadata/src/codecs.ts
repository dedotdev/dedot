import { $Bytes, notSupportedCodec } from '@dedot/codecs';
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
  ty: $TypeRef,
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
  numBytes: $.u32,
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
  version: $.u32,
  addressTy: $TypeRef,
  callTy: $TypeRef,
  signatureTy: $TypeRef,
  signedExtensions: $.Vec($SignedExtensionMetadata),
});

export type ExtrinsicMetadata = $.Input<typeof $ExtrinsicMetadata>;

/**
 * Metadata digest structure as defined in RFC-0078
 */
export const $MetadataDigest = $.Enum({
  V0: notSupportedCodec('Not supported!'),
  V1: $.Struct({
    typeInformationTreeRoot: $Bytes,
    extrinsicMetadataHash: $Bytes,
    specVersion: $.u32,
    specName: $.str,
    base58Prefix: $.u32,
    decimals: $.u32,
    tokenSymbol: $.str,
  }),
});

export type MetadataDigest = $.Input<typeof $MetadataDigest>;
