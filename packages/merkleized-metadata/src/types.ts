import { TypeRef } from './codecs';

type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Chain-specific information required for metadata hash calculation
 */
export interface ChainInfo {
  /** Runtime spec version */
  specVersion: number;

  /** Runtime spec name */
  specName: string;

  /** SS58 address format prefix */
  ss58Prefix: number;

  /** Token decimal places */
  decimals: number;

  /** Token symbol */
  tokenSymbol: string;
}

export type ChainInfoOptional = OptionalProps<ChainInfo, 'specVersion' | 'specName' | 'ss58Prefix'>;

/**
 * Metadata digest structure as defined in RFC-0078
 */
export interface MetadataDigestV1 {
  /** Root hash of the type information tree */
  typeInformationTreeRoot: Uint8Array;

  /** Hash of the extrinsic metadata */
  extrinsicMetadataHash: Uint8Array;

  /** Runtime spec version */
  specVersion: number;

  /** Runtime spec name */
  specName: string;

  /** SS58 address format prefix */
  base58Prefix: number;

  /** Token decimal places */
  decimals: number;

  /** Token symbol */
  tokenSymbol: string;
}

/**
 * Versioned metadata digest
 */
export type MetadataDigest = {
  type: 'V1';
  value: MetadataDigestV1;
};

/**
 * Merkle tree node in the metadata tree
 */
export interface MetadataTreeNode {
  /** Hash of the node */
  hash: Uint8Array;

  /** Left child node if available */
  left?: MetadataTreeNode;

  /** Right child node if available */
  right?: MetadataTreeNode;
}

/**
 * Field in a composite or enumeration type
 */
export interface Field {
  /** Optional field name */
  name?: string;

  /** Type reference */
  ty: TypeRef;

  /** Optional type name */
  typeName?: string;
}

/**
 * Array type definition
 */
export interface Array {
  /** Array length */
  len: number;

  /** Type parameter */
  typeParam: TypeRef;
}

/**
 * Bit sequence type definition
 */
export interface BitSequence {
  /** Number of bytes */
  numBytes: number;

  /** Whether least significant bit is first */
  leastSignificantBitFirst: boolean;
}

/**
 * Enumeration variant
 */
export interface EnumerationVariant {
  /** Variant name */
  name: string;

  /** Fields in the variant */
  fields: Field[];

  /** Variant index */
  index: number;
}

/**
 * Type definition as defined in RFC-0078
 */
export type TypeDef =
  | { type: 'composite'; value: Field[] }
  | { type: 'enumeration'; value: EnumerationVariant }
  | { type: 'sequence'; value: TypeRef }
  | { type: 'array'; value: Array }
  | { type: 'tuple'; value: TypeRef[] }
  | { type: 'bitSequence'; value: BitSequence };

/**
 * Type information as defined in RFC-0078
 */
export interface TypeInfo {
  /** Type path */
  path: string[];

  /** Type definition */
  typeDef: TypeDef;

  /** Type ID */
  typeId: number;
}

/**
 * Signed extension metadata as defined in RFC-0078
 */
export interface SignedExtensionMetadata {
  /** Identifier */
  identifier: string;

  /** Type included in extrinsic */
  includedInExtrinsic: TypeRef;

  /** Type included in signed data */
  includedInSignedData: TypeRef;
}

/**
 * Extrinsic metadata as defined in RFC-0078
 */
export interface ExtrinsicMetadata {
  /** Extrinsic version */
  version: number;

  /** Address type */
  addressTy: TypeRef;

  /** Call type */
  callTy: TypeRef;

  /** Signature type */
  signatureTy: TypeRef;

  /** Signed extensions */
  signedExtensions: SignedExtensionMetadata[];
}

/**
 * Proof for metadata verification
 */
export interface MetadataProof {
  /** Leaves included in the proof */
  leaves: TypeInfo[];

  /** Indices of the leaves in the original tree */
  leafIndices: number[];

  /** Proof hashes */
  proofs: Uint8Array[];

  /** Extrinsic metadata */
  extrinsicMetadata: ExtrinsicMetadata;

  /** Chain metadata info */
  chainInfo: ChainInfo;
}
