import { PortableRegistry, PortableType } from '@dedot/codecs';
import { TypeRef } from '../codecs';

/**
 * Map of primitive types to TypeRef tags
 */
export const PRIMITIVE_TYPE_MAP: Record<string, TypeRef['type']> = {
  bool: 'bool',
  char: 'char',
  str: 'str',
  u8: 'u8',
  u16: 'u16',
  u32: 'u32',
  u64: 'u64',
  u128: 'u128',
  u256: 'u256',
  i8: 'i8',
  i16: 'i16',
  i32: 'i32',
  i64: 'i64',
  i128: 'i128',
  i256: 'i256',
};

/**
 * Map of compact types to TypeRef tags
 */
export const COMPACT_TYPE_MAP: Record<string, TypeRef['type']> = {
  u8: 'compactU8',
  u16: 'compactU16',
  u32: 'compactU32',
  u64: 'compactU64',
  u128: 'compactU128',
  u256: 'compactU256',
};

/**
 * Get primitive type tag for a type
 *
 * @param type - Type to get primitive tag for
 * @param registry - Portable registry
 * @returns Primitive type tag or null if not a primitive
 */
function getPrimitiveType(type: PortableType, registry: PortableRegistry): TypeRef['type'] | null {
  if (type.typeDef.type === 'Primitive') {
    const primitive = type.typeDef.value.kind;
    return PRIMITIVE_TYPE_MAP[primitive] || null;
  }

  if (type.typeDef.type === 'Tuple' && type.typeDef.value.fields.length === 1) {
    return getPrimitiveType(registry.findType(type.typeDef.value.fields[0]), registry);
  }

  if (type.typeDef.type === 'Struct' && type.typeDef.value.fields.length === 1) {
    return getPrimitiveType(registry.findType(type.typeDef.value.fields[0].typeId), registry);
  }

  return null;
}

/**
 * Get compact type tag for a type
 *
 * @param type - Type to get compact tag for
 * @param registry - Portable registry
 * @returns Compact type tag or null if not a compact
 */
export function getCompactType(type: PortableType, registry: PortableRegistry): TypeRef['type'] | null {
  if (type.typeDef.type !== 'Compact') {
    return null;
  }

  const innerType = registry.findType(type.typeDef.value.typeParam);

  const primitive = getPrimitiveType(innerType, registry);
  return primitive ? COMPACT_TYPE_MAP[primitive] : null;
}
