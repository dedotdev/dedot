import * as $ from '@dedot/shape';
import { DedotError } from '@dedot/utils';
import { TypeInfo, TypeRef, EnumerationVariant } from '../codecs.js';

const PRIMITIVE_CODECS: Record<string, $.AnyShape> = {
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

/**
 * Interface representing the state during decoding
 */
interface DecodingState {
  toDecode: Uint8Array;
  typeInfo: TypeInfo[];
  typeIdMap: Map<number, number[]>;
  collectedIndices: Set<number>;
}

/**
 * Build a map of type IDs to their indices in the typeInfo array
 *
 * @param typeInfo - Array of type information
 * @returns Map of type IDs to their indices
 */
function buildTypeIdMap(typeInfo: TypeInfo[]): Map<number, number[]> {
  const map = new Map<number, number[]>();

  for (let idx = 0; idx < typeInfo.length; idx++) {
    const typeId = typeInfo[idx].typeId;
    const indices = map.get(typeId) || [];
    indices.push(idx);
    map.set(typeId, indices);
  }

  return map;
}

/**
 * Decode data using the provided codec and update the state
 *
 * @param state - Decoding state
 * @param codec - Shape codec to use for decoding
 * @returns Decoded data
 */
function decode(state: DecodingState, codec: $.AnyShape): any {
  try {
    const decoded = codec.decode(state.toDecode) as any;
    // @ts-ignore
    const encodedLength = codec.encode(decoded).length;
    state.toDecode = state.toDecode.subarray(encodedLength);
    return decoded;
  } catch (error: any) {
    throw new DedotError(`Failed to decode data: ${error.message || String(error)}`);
  }
}

/**
 * Process a per-ID type reference
 *
 * @param state - Decoding state
 * @param typeId - TypeId to process
 */
function processPerIdType(state: DecodingState, typeId: number): void {
  const indexes = state.typeIdMap.get(typeId);

  if (!indexes || indexes.length === 0) {
    throw new DedotError(`Type ID ${typeId} not found in type info`);
  }

  const idx = indexes[0];

  if (indexes.length === 1) {
    state.collectedIndices.add(idx);
  }

  const { typeDef } = state.typeInfo[idx];

  switch (typeDef.type) {
    case 'sequence': {
      const length = decode(state, $.compactU32);
      for (let i = 0; i < length; i++) {
        processTypeRef(state, typeDef.value);
      }
      break;
    }

    case 'tuple': {
      for (const tupleTypeRef of typeDef.value) {
        processTypeRef(state, tupleTypeRef);
      }
      break;
    }

    case 'array': {
      for (let i = 0; i < typeDef.value.len; i++) {
        processTypeRef(state, typeDef.value.typeParam);
      }
      break;
    }

    case 'composite': {
      for (const field of typeDef.value) {
        processTypeRef(state, field.typeRef);
      }
      break;
    }

    case 'bitSequence':
      // BitSequence doesn't need further decoding
      break;

    case 'enumeration': {
      const selectedIdx = decode(state, $.u8);

      const variantInfo = indexes
        .map((id) => [state.typeInfo[id].typeDef.value, id] as [EnumerationVariant, number])
        .find(([{ index }]) => index === selectedIdx);

      if (!variantInfo) {
        throw new DedotError(`Enum variant with index ${selectedIdx} not found for type ID ${typeId}`);
      }

      const [{ fields }, variantIdx] = variantInfo;
      state.collectedIndices.add(variantIdx);

      for (const field of fields) {
        processTypeRef(state, field.typeRef);
      }
      break;
    }

    default:
      throw new DedotError(`Unsupported type definition: ${(typeDef as any).type}`);
  }
}

/**
 * Process a type reference
 *
 * @param state - Decoding state
 * @param typeRef - Type reference to process
 */
function processTypeRef(state: DecodingState, typeRef: TypeRef): void {
  if (typeRef.type === 'perId') {
    processPerIdType(state, typeRef.value);
  } else {
    // Handle primitive type
    decode(state, PRIMITIVE_CODECS[typeRef.type]);
  }
}

/**
 * Decode extrinsic data and collect leaf indices
 *
 * @param toDecode - Data to decode
 * @param typeRefs - Type references to use for decoding
 * @param typeInfo - Type information
 * @returns Array of leaf indices
 */
export function decodeAndCollectLeaves(toDecode: Uint8Array, typeRefs: TypeRef[], typeInfo: TypeInfo[]): number[] {
  // Build type ID map
  const typeIdMap = buildTypeIdMap(typeInfo);

  // Create decoding state
  const state: DecodingState = {
    toDecode,
    typeInfo,
    typeIdMap,
    collectedIndices: new Set<number>(),
  };

  // Process all type references
  for (const typeRef of typeRefs) {
    processTypeRef(state, typeRef);
  }

  // Check if there are any remaining bytes
  if (state.toDecode.length > 0) {
    throw new DedotError(`Extra bytes at the end of the extrinsic: ${state.toDecode.length} bytes remaining`);
  }

  return [...state.collectedIndices].sort((a, b) => a - b);
}
