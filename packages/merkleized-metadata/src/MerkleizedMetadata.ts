import { $ExtrinsicVersion, $Metadata, ExtrinsicType, Metadata, RuntimeVersion } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { assert, blake3AsHex, blake3AsU8a, concatU8a, HexString, toU8a, u8aToHex } from '@dedot/utils';
import { $ExtrinsicMetadata, $MetadataDigest, $Proof, $TypeInfo, TypeRef } from './codecs.js';
import { buildMerkleTree, generateProof } from './merkle/index.js';
import { decodeAndCollectLeaves, transformMetadata } from './transform/index.js';
import { ChainInfo, ChainInfoOptional } from './types.js';
import { lookupConstant } from './utils.js';

/**
 * @name MerkleizedMetadata
 * @description A utility class for working with merkleized metadata according to RFC-0078.
 *
 * This class implements the Merkleized Metadata specification defined in
 * [RFC-0078](https://polkadot-fellows.github.io/RFCs/approved/0078-merkleized-metadata.html).
 * It provides functionality to:
 *
 * 1. Calculate metadata digest/hash
 * 2. Generate proofs for extrinsics
 * 3. Generate proofs for extrinsic payloads
 * 4. Generate proofs for extrinsic parts
 *
 * Merkleized metadata allows for efficient verification of blockchain metadata
 * by using Merkle trees to represent type information, enabling lightweight clients
 * to validate transactions without requiring the full metadata.
 *
 * @example
 * ```typescript
 * // Create a merkleizer instance
 * const merkleizer = new MerkleizedMetadata(metadata, {
 *   decimals: 10,
 *   tokenSymbol: 'DOT'
 * });
 *
 * // Calculate metadata hash
 * const hash = merkleizer.digest();
 * ```
 */
export class MerkleizedMetadata {
  readonly #metadata: Metadata;
  readonly #chainInfo: ChainInfo;

  /**
   * Creates a new MerkleizedMetadata instance.
   *
   * @param metadata - The metadata to process, can be provided as a Metadata object,
   *                   a hex string, or a Uint8Array. If provided as a string or Uint8Array,
   *                   it will be decoded into a Metadata object.
   * @param chainInfo - Chain-specific information required for metadata processing.
   *                    Some fields (specVersion, specName, ss58Prefix) will be automatically
   *                    extracted from the metadata if not provided. The decimals and tokenSymbol
   *                    fields are required and must be provided.
   *
   * @example
   * ```typescript
   * // Using a Metadata object
   * const merkleizer = new MerkleizedMetadata(metadata, {
   *   decimals: 10,
   *   tokenSymbol: 'DOT'
   * });
   *
   * // Using a hex string
   * const merkleizer = new MerkleizedMetadata('0x...', {
   *   decimals: 12,
   *   tokenSymbol: 'KSM'
   * });
   * ```
   */
  constructor(metadata: Metadata | HexString | Uint8Array, chainInfo: ChainInfoOptional) {
    // Try decode metadata
    if (!(metadata instanceof Metadata)) {
      metadata = $Metadata.tryDecode(metadata);
    }

    this.#metadata = metadata;

    const { specVersion, specName } = lookupConstant<RuntimeVersion>(this.#metadata, 'system', 'version');
    const ss58Prefix = lookupConstant<number>(this.#metadata, 'system', 'ss58Prefix');

    this.#chainInfo = {
      specVersion,
      specName,
      ss58Prefix,
      ...chainInfo,
    };
  }

  /**
   * Calculates the metadata digest according to RFC-0078.
   *
   * @returns The metadata digest as a Uint8Array
   *
   * @example
   * ```typescript
   * const merkleizer = new MerkleizedMetadata(metadata, chainInfo);
   * const digest = merkleizer.digest();
   * console.log('Metadata Hash:', u8aToHex(digest));
   * ```
   */
  digest(): Uint8Array {
    const { typeInfo, extrinsicMetadata } = transformMetadata(this.#metadata);

    const encodedTypes = typeInfo.map((info) => $TypeInfo.encode(info));

    return blake3AsU8a(
      $MetadataDigest.encode({
        type: 'V1',
        value: {
          typeInformationTreeRoot: u8aToHex(buildMerkleTree(encodedTypes)[0]),
          extrinsicMetadataHash: blake3AsHex($ExtrinsicMetadata.encode(extrinsicMetadata)),
          chainInfo: this.#chainInfo,
        },
      }),
    );
  }

  /**
   * Generates a proof for an extrinsic.
   *
   * @param extrinsic - The extrinsic to generate proof for, as a Uint8Array or hex string
   * @param additionalSigned - Optional additional signed data, as a Uint8Array or hex string.
   *                           This is typically used for including extra data that was signed
   *                           but not included in the extrinsic itself.
   * @returns The proof as a Uint8Array
   * @throws {Error} If the extrinsic version doesn't match the expected version from metadata
   *
   * @example
   * ```typescript
   * // Generate proof for an extrinsic
   * const extrinsicHex = '0x...'; // Hex-encoded extrinsic
   * const proof = merkleizer.proofForExtrinsic(extrinsicHex);
   *
   * // With additional signed data
   * const additionalSigned = '0x...';
   * const proofWithExtra = merkleizer.proofForExtrinsic(extrinsicHex, additionalSigned);
   * ```
   */
  proofForExtrinsic(extrinsic: Uint8Array | HexString, additionalSigned?: Uint8Array | HexString): Uint8Array {
    // Decode the extrinsic to extract call data, extrinsic extra, and signed extra
    const $Codec = $.Tuple($.compactU32, $ExtrinsicVersion, $.RawHex);
    const [, version, bytes] = $Codec.tryDecode(extrinsic);

    const { extrinsicMetadata, typeInfo } = transformMetadata(this.#metadata);

    assert(
      version.version === extrinsicMetadata.version,
      `Invalid extrinsic version, expected version ${extrinsicMetadata.version}`,
    );

    let toDecode = toU8a(bytes);

    // Identify the type IDs used in the extrinsic
    const typeRefs: TypeRef[] = [];
    if (version.type == ExtrinsicType.Signed) {
      typeRefs.push(
        extrinsicMetadata.addressTypeId,
        extrinsicMetadata.signatureTypeId,
        ...extrinsicMetadata.signedExtensions.map((e) => e.includedInExtrinsic),
        extrinsicMetadata.callTypeId,
      );
    } else {
      typeRefs.push(extrinsicMetadata.callTypeId);
    }

    if (additionalSigned) {
      typeRefs.push(...extrinsicMetadata.signedExtensions.map((e) => e.includedInSignedData));
      toDecode = concatU8a(toU8a(toDecode), toU8a(additionalSigned));
    }

    const knownLeafIndices = decodeAndCollectLeaves(toDecode, typeRefs, typeInfo);

    const leaves = typeInfo.map((info) => $TypeInfo.encode(info));

    const proof = generateProof(leaves, knownLeafIndices);

    return $Proof.encode({
      ...proof,
      extrinsicMetadata,
      chainInfo: this.#chainInfo,
    });
  }

  /**
   * Generates a proof for extrinsic parts.
   *
   * @param callData - The call data (function call and parameters), as a Uint8Array or hex string
   * @param includedInExtrinsic - Data included in the extrinsic (like address, signature),
   *                              as a Uint8Array or hex string
   * @param includedInSignedData - Data included in the signed payload (like era, nonce),
   *                               as a Uint8Array or hex string
   * @returns The proof as a Uint8Array
   *
   * @example
   * ```typescript
   * // Generate proof for extrinsic parts
   * const callData = '0x...'; // Hex-encoded call data
   * const includedInExtrinsic = '0x...'; // Hex-encoded extrinsic extra
   * const includedInSignedData = '0x...'; // Hex-encoded signed extra
   * const proof = merkleizer.proofForExtrinsicParts(
   *   callData,
   *   includedInExtrinsic,
   *   includedInSignedData
   * );
   * ```
   */
  proofForExtrinsicParts(
    callData: Uint8Array | HexString,
    includedInExtrinsic: Uint8Array | HexString,
    includedInSignedData: Uint8Array | HexString,
  ): Uint8Array {
    const txPayload = concatU8a(
      toU8a(callData), // prettier-end-here
      toU8a(includedInExtrinsic),
      toU8a(includedInSignedData),
    );

    return this.proofForExtrinsicPayload(txPayload);
  }

  /**
   * Generates a proof for an extrinsic payload.
   *
   * @param txPayload - The transaction payload, as a Uint8Array or hex string.
   *                    This should contain the complete data that was signed.
   * @returns The proof as a Uint8Array
   *
   * @example
   * ```typescript
   * // Generate proof for extrinsic payload
   * const txPayload = '0x...'; // Hex-encoded extrinsic payload
   * const proof = merkleizer.proofForExtrinsicPayload(txPayload);
   * ```
   */
  proofForExtrinsicPayload(txPayload: Uint8Array | HexString): Uint8Array {
    const { extrinsicMetadata, typeInfo } = transformMetadata(this.#metadata);

    const typeRefs: TypeRef[] = [
      extrinsicMetadata.callTypeId,
      ...extrinsicMetadata.signedExtensions.map((e) => e.includedInExtrinsic),
      ...extrinsicMetadata.signedExtensions.map((e) => e.includedInSignedData),
    ];

    const knownLeafIndices = decodeAndCollectLeaves(toU8a(txPayload), typeRefs, typeInfo);

    const leaves = typeInfo.map((info) => $TypeInfo.encode(info));

    return $Proof.encode({
      ...generateProof(leaves, knownLeafIndices),
      extrinsicMetadata,
      chainInfo: this.#chainInfo,
    });
  }
}
