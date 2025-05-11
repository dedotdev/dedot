import { $ExtrinsicVersion, $Metadata, Metadata, RuntimeVersion } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { assert, blake3AsHex, blake3AsU8a, concatU8a, HexString, toU8a, u8aToHex } from '@dedot/utils';
import { $ExtrinsicMetadata, $MetadataDigest, $Proof, $TypeInfo, TypeRef } from './codecs';
import { buildMerkleTree, generateProof } from './merkle';
import { decodeAndCollectLeaves, lookupConstant, transformMetadata } from './transform';
import { ChainInfo, ChainInfoOptional } from './types.js';

/**
 * @name MerkleizedMetadata
 * @description Utility for calculating merkleized metadata hash according to RFC-0078
 */
export class MerkleizedMetadata {
  readonly #metadata: Metadata;
  readonly #chainInfo: ChainInfo;

  /**
   * Create a new MerkleizedMetadata instance
   *
   * @param metadata - The metadata to calculate hash for
   * @param chainInfo - Chain-specific information
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
   * Get the metadata digest
   *
   * @returns The metadata digest
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
   * Generate proof for an extrinsic
   *
   * @param extrinsic - The extrinsic to generate proof for
   * @param additionalSigned - Optional additional signed data
   * @returns The metadata proof
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
    if (version.signed) {
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
   * Generate proof for extrinsic parts
   *
   * @param callData - Call data
   * @param includedInExtrinsic - Data included in extrinsic
   * @param includedInSignedData - Data included in signed data
   * @returns The metadata proof
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
   * Generate proof for extrinsic payload
   *
   * @param txPayload - Transaction payload
   * @returns The metadata proof
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
