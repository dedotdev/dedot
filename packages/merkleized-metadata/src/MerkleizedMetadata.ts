import { $ExtrinsicVersion, $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { assert, blake3AsHex, blake3AsU8a, concatU8a, HexString, stringCamelCase, toU8a, u8aToHex } from '@dedot/utils';
import {
  $ExtrinsicMetadata,
  $MetadataDigest,
  $Proof,
  $TypeInfo,
  EnumerationVariant,
  MetadataDigest,
  TypeInfo,
  TypeRef,
} from './codecs';
import { buildMerkleTree, generateProof } from './merkle';
import { transformMetadata } from './transform';
import { ChainInfo, ChainInfoOptional } from './types.js';

/**
 * Error thrown when decoding extrinsic data fails
 */
export class ExtrinsicDecodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtrinsicDecodingError';
  }
}

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
  digest(): Uint8Array {
    const { typeInfo, extrinsicMetadata } = transformMetadata(this.#metadata);

    const encodedTypes = typeInfo.map((info) => $TypeInfo.encode(info));

    const digest: MetadataDigest = {
      type: 'V1',
      value: {
        typeInformationTreeRoot: u8aToHex(buildMerkleTree(encodedTypes)[0]),
        extrinsicMetadataHash: blake3AsHex($ExtrinsicMetadata.encode(extrinsicMetadata)),
        chainInfo: this.#chainInfo,
      },
    };

    return blake3AsU8a($MetadataDigest.encode(digest));
  }

  /**
   * Decode extrinsic data and collect leaf indices
   *
   * @param toDecode - Data to decode
   * @param typeRefs - Type references to use for decoding
   * @param typeInfo - Type information
   * @returns Array of leaf indices
   */
  #decodeAndCollectLeaves(toDecode: Uint8Array, typeRefs: TypeRef[], typeInfo: TypeInfo[]): number[] {
    type PrimitiveType =
      | 'bool'
      | 'char'
      | 'str'
      | 'u8'
      | 'u16'
      | 'u32'
      | 'u64'
      | 'u128'
      | 'u256'
      | 'i8'
      | 'i16'
      | 'i32'
      | 'i64'
      | 'i128'
      | 'i256'
      | 'compactU8'
      | 'compactU16'
      | 'compactU32'
      | 'compactU64'
      | 'compactU128'
      | 'compactU256'
      | 'void';

    const primitiveCodecs: Record<PrimitiveType, $.AnyShape> = {
      bool: $.bool,
      char: $.u8,
      str: $.str,
      u8: $.u8,
      u16: $.u16,
      u32: $.u32,
      u64: $.u64,
      u128: $.u128,
      u256: $.u256,
      i8: $.i8,
      i16: $.i16,
      i32: $.i32,
      i64: $.i64,
      i128: $.i128,
      i256: $.i256,
      compactU8: $.compactU8,
      compactU16: $.compactU16,
      compactU32: $.compactU32,
      compactU64: $.compactU64,
      compactU128: $.compactU128,
      compactU256: $.compactU256,
      void: $.Null,
    };

    // Create a map of type IDs to their indices in the typeInfo array
    const refIdToIdx = new Map<number, number[]>();
    typeInfo.forEach((one, idx) => {
      const bag = refIdToIdx.get(one.typeId);
      if (bag) {
        bag.push(idx);
      } else {
        refIdToIdx.set(one.typeId, [idx]);
      }
    });

    // Helper function to decode data
    const decode = ($codec: $.AnyShape) => {
      try {
        const decoded = $codec.decode(toDecode) as any;
        // @ts-ignore
        const encodedLength = $codec.encode(decoded).length;
        toDecode = toDecode.subarray(encodedLength);
        return decoded;
      } catch (error: any) {
        throw new ExtrinsicDecodingError(`Failed to decode data: ${error.message || String(error)}`);
      }
    };

    const collectedIndices = new Set<number>();

    // Recursive function to decode and collect leaf indices
    const decodeAndCollect = (one: TypeRef) => {
      if (one.type === 'perId') {
        const indexes = refIdToIdx.get(one.value);

        if (!indexes || indexes.length === 0) {
          throw new ExtrinsicDecodingError(`Type ID ${one.value} not found in type info`);
        }

        const [idx] = indexes;

        if (indexes.length === 1) collectedIndices.add(idx);

        const { typeDef } = typeInfo[idx];

        switch (typeDef.type) {
          case 'sequence':
            const length = decode($.compactU32);
            for (let i = 0; i < length; i += 1) {
              decodeAndCollect(typeDef.value);
            }
            break;

          case 'tuple':
            typeDef.value.forEach(decodeAndCollect);
            break;

          case 'array':
            for (let i = 0; i < typeDef.value.len; i += 1) {
              decodeAndCollect(typeDef.value.typeParam);
            }
            break;

          case 'composite':
            typeDef.value.forEach((one) => decodeAndCollect(one.ty));
            break;

          case 'bitSequence':
            // BitSequence doesn't need further decoding
            break;

          case 'enumeration':
            const selectedIdx = decode($.u8);

            const variantInfo = refIdToIdx
              .get(one.value)
              ?.map((id) => [typeInfo[id].typeDef.value, id] as [EnumerationVariant, number])
              .find(([{ index }]) => index === selectedIdx);

            if (!variantInfo) {
              throw new ExtrinsicDecodingError(
                `Enum variant with index ${selectedIdx} not found for type ID ${one.value}`,
              );
            }

            const [{ fields }, idx] = variantInfo;
            collectedIndices.add(idx);
            fields.forEach(({ ty }) => decodeAndCollect(ty));
            break;

          default:
            // This should never happen as we've covered all possible typeDef types
            throw new ExtrinsicDecodingError(`Unsupported type definition: ${(typeDef as any).type}`);
        }
      } else {
        decode(primitiveCodecs[one.type]);
      }
    };

    // Process all type references
    typeRefs.forEach(decodeAndCollect);

    // Check if there are any remaining bytes
    if (toDecode.length > 0) {
      throw new ExtrinsicDecodingError(`Extra bytes at the end of the extrinsic: ${toDecode.length} bytes remaining`);
    }

    return [...collectedIndices].sort((a, b) => a - b);
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

    let toDecode = toU8a(bytes);

    assert(
      version.version === extrinsicMetadata.version,
      `Invalid extrinsic version, expected version ${extrinsicMetadata.version}`,
    );

    // Identify the type IDs used in the extrinsic
    const typeRefs: TypeRef[] = [];
    if (version.signed) {
      typeRefs.push(
        extrinsicMetadata.addressTy,
        extrinsicMetadata.signatureTy,
        ...extrinsicMetadata.signedExtensions.map((e) => e.includedInExtrinsic),
        extrinsicMetadata.callTy,
      );
    } else {
      typeRefs.push(extrinsicMetadata.callTy);
    }

    if (additionalSigned) {
      typeRefs.push(...extrinsicMetadata.signedExtensions.map((e) => e.includedInSignedData));
      toDecode = concatU8a(toU8a(toDecode), toU8a(additionalSigned));
    }

    const knownLeafIndices = this.#decodeAndCollectLeaves(toDecode, typeRefs, typeInfo);

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
    const payload = concatU8a(toU8a(callData), toU8a(includedInExtrinsic), toU8a(includedInSignedData));

    return this.proofForExtrinsicPayload(payload);
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
      extrinsicMetadata.callTy,
      ...extrinsicMetadata.signedExtensions.map((e) => e.includedInExtrinsic),
      ...extrinsicMetadata.signedExtensions.map((e) => e.includedInSignedData),
    ];

    const knownLeafIndices = this.#decodeAndCollectLeaves(toU8a(txPayload), typeRefs, typeInfo);

    const leaves = typeInfo.map((info) => $TypeInfo.encode(info));

    return $Proof.encode({
      ...generateProof(leaves, knownLeafIndices),
      extrinsicMetadata,
      chainInfo: this.#chainInfo,
    });
  }

  /**
   * Look up a constant in the metadata
   *
   * @param pallet - Pallet name
   * @param constant - Constant name
   * @returns Constant value
   */
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
