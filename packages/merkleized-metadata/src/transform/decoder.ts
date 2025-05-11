import * as $ from '@dedot/shape';
import { DedotError } from '@dedot/utils';
import { TypeInfo, TypeRef, EnumerationVariant } from '../codecs';

/**
 * Decode extrinsic data and collect leaf indices
 *
 * @param toDecode - Data to decode
 * @param typeRefs - Type references to use for decoding
 * @param typeInfo - Type information
 * @returns Array of leaf indices
 */
export function decodeAndCollectLeaves(toDecode: Uint8Array, typeRefs: TypeRef[], typeInfo: TypeInfo[]): number[] {
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
      throw new DedotError(`Failed to decode data: ${error.message || String(error)}`);
    }
  };

  const collectedIndices = new Set<number>();

  // Recursive function to decode and collect leaf indices
  const decodeAndCollect = (one: TypeRef) => {
    if (one.type === 'perId') {
      const indexes = refIdToIdx.get(one.value);

      if (!indexes || indexes.length === 0) {
        throw new DedotError(`Type ID ${one.value} not found in type info`);
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
            throw new DedotError(`Enum variant with index ${selectedIdx} not found for type ID ${one.value}`);
          }

          const [{ fields }, idx] = variantInfo;
          collectedIndices.add(idx);
          fields.forEach(({ ty }) => decodeAndCollect(ty));
          break;

        default:
          // This should never happen as we've covered all possible typeDef types
          throw new DedotError(`Unsupported type definition: ${(typeDef as any).type}`);
      }
    } else {
      decode(primitiveCodecs[one.type]);
    }
  };

  // Process all type references
  typeRefs.forEach(decodeAndCollect);

  // Check if there are any remaining bytes
  if (toDecode.length > 0) {
    throw new DedotError(`Extra bytes at the end of the extrinsic: ${toDecode.length} bytes remaining`);
  }

  return [...collectedIndices].sort((a, b) => a - b);
}
