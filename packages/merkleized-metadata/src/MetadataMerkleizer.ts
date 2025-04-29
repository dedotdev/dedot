import { $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { assert, blake3AsHex, HexString, stringCamelCase } from '@dedot/utils';
import { $MetadataDigest } from './codecs';
import { createMetadataDigest } from './digest.js';
import { ChainInfo, ChainInfoOptional, MetadataProof } from './types.js';

/**
 * @name MerkleizedMetatada
 * @description Utility for calculating merkleized metadata hash according to RFC-0078
 */
export class MerkleizedMetatada {
  readonly #metadata: Metadata;
  readonly #chainInfo: ChainInfo;

  /**
   * Create a new MetatadaMerkleizer instance
   *
   * @param metadata - The metadata to calculate hash for
   * @param chainInfo - Chain-specific information
   */
  constructor(metadata: Metadata | HexString | Uint8Array, chainInfo: ChainInfoOptional) {
    // Try decode metadata
    if (typeof metadata === 'string' || metadata instanceof Uint8Array) {
      metadata = $Metadata.tryDecode(metadata);
    }

    this.#metadata = metadata;

    const runtimeVersion = this.#lookupConstant<RuntimeVersion>('system', 'version');
    const ss58Prefix = this.#lookupConstant<number>('system', 'ss58Prefix');

    this.#chainInfo = {
      specVersion: runtimeVersion.specVersion,
      specName: runtimeVersion.specName,
      ss58Prefix,
      ...chainInfo,
    };
  }

  /**
   * Get the metadata digest
   *
   * @returns The metadata digest
   */
  digest(): HexString {
    return blake3AsHex($MetadataDigest.encode(createMetadataDigest(this.#metadata, this.#chainInfo)));
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
    throw new Error('To implement!');
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
    // In a real implementation, we would:
    // 1. Decode the call data, extrinsic extra, and signed extra
    // 2. Identify the type IDs used in these components
    // 3. Generate proof for those type IDs
    throw new Error('To implement!');
  }

  #lookupConstant<T extends any = any>(pallet: string, constant: string): T {
    const registry = new PortableRegistry(this.#metadata.latest);
    const targetPallet = this.#metadata.latest.pallets.find((p) => stringCamelCase(p.name) === pallet);

    assert(targetPallet, `Pallet not found: ${pallet}`);

    const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constant);

    assert(constantDef, `Constant ${constant} not found in pallet ${pallet}`);

    const $codec = registry.findCodec(constantDef.typeId);

    return $codec.tryDecode(constantDef.value) as T;
  }
}
