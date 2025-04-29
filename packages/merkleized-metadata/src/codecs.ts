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
  /** Optional field name */
  name: $.Option($.str),

  /** Type reference */
  ty: $TypeRef,

  /** Optional type name */
  typeName: $.Option($.str),
});

export type Field = $.Input<typeof $Field>;

/**
 * Array type definition
 */
export const $TypeDefArray = $.Struct({
  /** Array length */
  len: $.u32,

  /** Type parameter */
  typeParam: $TypeRef,
});

export type TypeDefArray = $.Input<typeof $TypeDefArray>;

/**
 * Bit sequence type definition
 */
export const $TypeDefBitSequence = $.Struct({
  /** Number of bytes */
  numBytes: $.u32,

  /** Whether least significant bit is first */
  leastSignificantBitFirst: $.bool,
});

export type TypeDefBitSequence = $.Input<typeof $TypeDefBitSequence>;

/**
 * Enumeration variant
 */
export const $EnumerationVariant = $.Struct({
  /** Variant name */
  name: $.str,

  /** Fields in the variant */
  fields: $.Vec($Field),

  /** Variant index */
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
  /** Type path */
  path: $.Vec($.str),

  /** Type definition */
  typeDef: $TypeDef,

  /** Type ID */
  typeId: $.compactU32,
});

export type TypeInfo = $.Input<typeof $TypeInfo>;

/**
 * Signed extension metadata as defined in RFC-0078
 */
export const $SignedExtensionMetadata = $.Struct({
  /** Identifier */
  identifier: $.str,

  /** Type included in extrinsic */
  includedInExtrinsic: $TypeRef,

  /** Type included in signed data */
  includedInSignedData: $TypeRef,
});

export type SignedExtensionMetadata = $.Input<typeof $SignedExtensionMetadata>;

/**
 * Extrinsic metadata as defined in RFC-0078
 */
export const $ExtrinsicMetadata = $.Struct({
  /** Extrinsic version */
  version: $.u32,

  /** Address type */
  addressTy: $TypeRef,

  /** Call type */
  callTy: $TypeRef,

  /** Signature type */
  signatureTy: $TypeRef,

  /** Signed extensions */
  signedExtensions: $.Vec($SignedExtensionMetadata),
});

export type ExtrinsicMetadata = $.Input<typeof $ExtrinsicMetadata>;

/**
 * Metadata digest structure as defined in RFC-0078
 */
export const $MetadataDigestV1 = $.Struct({
  /** Root hash of the type information tree */
  typeInformationTreeRoot: $Bytes,

  /** Hash of the extrinsic metadata */
  extrinsicMetadataHash: $Bytes,

  /** Runtime spec version */
  specVersion: $.u32,

  /** Runtime spec name */
  specName: $.str,

  /** SS58 address format prefix */
  base58Prefix: $.u32,

  /** Token decimal places */
  decimals: $.u32,

  /** Token symbol */
  tokenSymbol: $.str,
});

export type MetadataDigestV1 = $.Input<typeof $MetadataDigestV1>;

/**
 * Versioned metadata digest
 */
export const $MetadataDigest = $.Enum({
  V0: notSupportedCodec('Not supported!'),
  V1: $MetadataDigestV1,
});

export type MetadataDigest = $.Input<typeof $MetadataDigest>;

/**
 * Chain-specific information required for metadata hash calculation
 */
export const $ChainInfo = $.Struct({
  /** Runtime spec version */
  specVersion: $.u32,

  /** Runtime spec name */
  specName: $.str,

  /** SS58 address format prefix */
  ss58Prefix: $.u32,

  /** Token decimal places */
  decimals: $.u32,

  /** Token symbol */
  tokenSymbol: $.str,
});

export type ChainInfo = $.Input<typeof $ChainInfo>;
