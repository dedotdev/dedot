import { Metadata } from '@dedot/codecs';
import { blake3AsU8a } from '@dedot/utils';
import { buildMerkleTree } from './merkle.js';
import { transformMetadata } from './transform.js';
import { ChainMetadataInfo, ExtrinsicMetadata, MetadataDigest, MetadataDigestV1, TypeInfo } from './types.js';

/**
 * Encode type information for hashing
 *
 * @param typeInfo - Type information to encode
 * @returns Encoded type information
 */
export function encodeTypeInfo(typeInfo: TypeInfo): Uint8Array {
  // Simple JSON encoding for now
  // In a production implementation, this would use SCALE encoding
  return new TextEncoder().encode(JSON.stringify(typeInfo));
}

/**
 * Encode extrinsic metadata for hashing
 *
 * @param extrinsicMetadata - Extrinsic metadata to encode
 * @returns Encoded extrinsic metadata
 */
export function encodeExtrinsicMetadata(extrinsicMetadata: ExtrinsicMetadata): Uint8Array {
  // Simple JSON encoding for now
  // In a production implementation, this would use SCALE encoding
  return new TextEncoder().encode(JSON.stringify(extrinsicMetadata));
}

/**
 * Create metadata digest from metadata and chain info
 *
 * @param metadata - Metadata to create digest for
 * @param chainInfo - Chain-specific information
 * @returns Metadata digest
 */
export function createMetadataDigest(metadata: Metadata, chainInfo: ChainMetadataInfo): MetadataDigest {
  // Transform metadata to RFC format
  const { typeInfo, extrinsicMetadata } = transformMetadata(metadata);

  // Encode type information
  const encodedTypes = typeInfo.map(encodeTypeInfo);

  // Build merkle tree from encoded type information
  const typeTree = buildMerkleTree(encodedTypes);

  // Hash extrinsic metadata
  const encodedExtrinsicMetadata = encodeExtrinsicMetadata(extrinsicMetadata);
  const extrinsicMetadataHash = blake3AsU8a(encodedExtrinsicMetadata);

  // Create digest
  const digestV1: MetadataDigestV1 = {
    typeInformationTreeRoot: typeTree.hash,
    extrinsicMetadataHash,
    specVersion: chainInfo.specVersion,
    specName: chainInfo.specName,
    base58Prefix: chainInfo.ss58Prefix,
    decimals: chainInfo.decimals,
    tokenSymbol: chainInfo.tokenSymbol,
  };

  return {
    type: 'V1',
    value: digestV1,
  };
}

/**
 * Encode metadata digest for hashing
 *
 * @param digest - Metadata digest to encode
 * @returns Encoded metadata digest
 */
export function encodeMetadataDigest(digest: MetadataDigest): Uint8Array {
  // Simple JSON encoding for now
  // In a production implementation, this would use SCALE encoding
  return new TextEncoder().encode(JSON.stringify(digest));
}

/**
 * Calculate metadata hash from metadata and chain info
 *
 * @param metadata - Metadata to calculate hash for
 * @param chainInfo - Chain-specific information
 * @returns Metadata hash result
 */
export function calculateMetadataHash(metadata: Metadata, chainInfo: ChainMetadataInfo): Uint8Array {
  const digest = createMetadataDigest(metadata, chainInfo);
  const encodedDigest = encodeMetadataDigest(digest);
  return blake3AsU8a(encodedDigest);
}
