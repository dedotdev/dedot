import { Metadata } from '@dedot/codecs';
import { blake3AsU8a } from '@dedot/utils';
import { $ExtrinsicMetadata, $MetadataDigest, $TypeInfo } from './codecs';
import { buildMerkleTree } from './merkle.js';
import { transformMetadata } from './transform.js';
import { ChainInfo, MetadataDigest, MetadataDigestV1 } from './types.js';

/**
 * Create metadata digest from metadata and chain info
 *
 * @param metadata - Metadata to create digest for
 * @param chainInfo - Chain-specific information
 * @returns Metadata digest
 */
export function createMetadataDigest(metadata: Metadata, chainInfo: ChainInfo): MetadataDigest {
  // Transform metadata to RFC format
  const { typeInfo, extrinsicMetadata } = transformMetadata(metadata);

  // Encode type information
  const encodedTypes = typeInfo.map((info) => $TypeInfo.encode(info));

  // Build merkle tree from encoded type information
  const typeTree = buildMerkleTree(encodedTypes);

  // Hash extrinsic metadata
  const encodedExtrinsicMetadata = $ExtrinsicMetadata.encode(extrinsicMetadata);
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
 * Calculate metadata hash from metadata and chain info
 *
 * @param metadata - Metadata to calculate hash for
 * @param chainInfo - Chain-specific information
 * @returns Metadata hash result
 */
export function calculateMetadataHash(metadata: Metadata, chainInfo: ChainInfo): Uint8Array {
  return blake3AsU8a($MetadataDigest.encode(createMetadataDigest(metadata, chainInfo)));
}
