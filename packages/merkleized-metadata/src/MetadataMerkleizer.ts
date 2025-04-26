import { Metadata } from '@dedot/codecs';
import { HexString, hexToU8a, isHex } from '@dedot/utils';
import { calculateMetadataHash, createMetadataDigest } from './digest.js';
import { generateProof } from './merkle.js';
import { transformMetadata } from './transform.js';
import { ChainMetadataInfo, MetadataDigest, MetadataProof, TypeInfo } from './types.js';

/**
 * @name MetatadaMerkleizer
 * @description Utility for calculating merkleized metadata hash according to RFC-0078
 */
export class MetatadaMerkleizer {
  readonly #metadata: Metadata;
  readonly #chainInfo: ChainMetadataInfo;
  readonly #typeInfo: TypeInfo[];
  readonly #encodedTypes: Uint8Array[];
  readonly #extrinsicMetadata: any;

  /**
   * Create a new MetatadaMerkleizer instance
   *
   * @param metadata - The metadata to calculate hash for
   * @param chainInfo - Chain-specific information
   */
  constructor(metadata: Metadata, chainInfo: ChainMetadataInfo) {
    this.#metadata = metadata;
    this.#chainInfo = chainInfo;

    // Transform metadata to RFC format
    const { typeInfo, extrinsicMetadata } = transformMetadata(metadata);
    this.#typeInfo = typeInfo;
    this.#extrinsicMetadata = extrinsicMetadata;

    // Encode type information
    this.#encodedTypes = typeInfo.map((info) => {
      // Simple JSON encoding for now
      // In a production implementation, this would use SCALE encoding
      return new TextEncoder().encode(JSON.stringify(info));
    });
  }

  /**
   * Calculate the metadata hash
   *
   * @returns The metadata hash result
   */
  hash(): Uint8Array {
    return calculateMetadataHash(this.#metadata, this.#chainInfo);
  }

  /**
   * Get the metadata digest
   *
   * @returns The metadata digest
   */
  digest(): MetadataDigest {
    return createMetadataDigest(this.#metadata, this.#chainInfo);
  }

  /**
   * Generate proof for an extrinsic
   *
   * @param extrinsic - The extrinsic to generate proof for
   * @param additionalSigned - Optional additional signed data
   * @returns The metadata proof
   */
  proofForExtrinsic(extrinsic: Uint8Array | HexString, additionalSigned?: Uint8Array | HexString): MetadataProof {
    // In a real implementation, we would:
    // 1. Decode the extrinsic to extract call data, extrinsic extra, and signed extra
    // 2. Identify the type IDs used in the extrinsic
    // 3. Generate proof for those type IDs

    // For now, we'll just generate a proof for the first few types as an example
    const typeIndices = [0, 1, 2].filter((i) => i < this.#typeInfo.length);

    const { leaves, leafIndices, proofs } = generateProof(this.#encodedTypes, typeIndices);

    return {
      leaves: typeIndices.map((i) => this.#typeInfo[i]),
      leafIndices,
      proofs,
      extrinsicMetadata: this.#extrinsicMetadata,
      chainInfo: this.#chainInfo,
    };
  }

  /**
   * Generate proof for extrinsic parts
   *
   * @param callData - The call data
   * @param extrinsicExtra - The extrinsic extra data
   * @param signedExtra - The signed extra data
   * @returns The metadata proof
   */
  proofForExtrinsicParts(
    callData: Uint8Array | HexString,
    extrinsicExtra: Uint8Array | HexString,
    signedExtra: Uint8Array | HexString,
  ): MetadataProof {
    // Convert hex strings to Uint8Array if needed
    const callDataBytes = isHex(callData) ? hexToU8a(callData as HexString) : (callData as Uint8Array);
    const extrinsicExtraBytes = isHex(extrinsicExtra)
      ? hexToU8a(extrinsicExtra as HexString)
      : (extrinsicExtra as Uint8Array);
    const signedExtraBytes = isHex(signedExtra) ? hexToU8a(signedExtra as HexString) : (signedExtra as Uint8Array);

    // In a real implementation, we would:
    // 1. Decode the call data, extrinsic extra, and signed extra
    // 2. Identify the type IDs used in these components
    // 3. Generate proof for those type IDs

    // For now, we'll just generate a proof for the first few types as an example
    const typeIndices = [0, 1, 2].filter((i) => i < this.#typeInfo.length);

    const { leaves, leafIndices, proofs } = generateProof(this.#encodedTypes, typeIndices);

    return {
      leaves: typeIndices.map((i) => this.#typeInfo[i]),
      leafIndices,
      proofs,
      extrinsicMetadata: this.#extrinsicMetadata,
      chainInfo: this.#chainInfo,
    };
  }
}
