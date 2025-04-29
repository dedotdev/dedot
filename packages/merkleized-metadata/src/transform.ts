import { Metadata, PortableRegistry, PortableType } from '@dedot/codecs';
import { TypeRef } from './codecs';
import { ExtrinsicMetadata, Field, TypeInfo } from './codecs.js';

/**
 * Map of primitive types to TypeRef tags
 */
const PRIMITIVE_TYPE_MAP: Record<string, TypeRef['type']> = {
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
const COMPACT_TYPE_MAP: Record<string, TypeRef['type']> = {
  u8: 'compactU8',
  u16: 'compactU16',
  u32: 'compactU32',
  u64: 'compactU64',
  u128: 'compactU128',
  u256: 'compactU256',
};

/**
 * Check if a type is a primitive type
 *
 * @param type - Type to check
 * @param registry - Portable registry
 * @returns Whether the type is a primitive type
 */
function isPrimitiveType(type: PortableType, registry: PortableRegistry): boolean {
  return type.typeDef.type === 'Primitive';
}

/**
 * Get primitive type tag for a type
 *
 * @param type - Type to get primitive tag for
 * @param registry - Portable registry
 * @returns Primitive type tag or null if not a primitive
 */
function getPrimitiveTypeTag(type: PortableType, registry: PortableRegistry): TypeRef['type'] | null {
  if (type.typeDef.type !== 'Primitive') {
    return null;
  }

  const primitive = type.typeDef.value.kind;
  return PRIMITIVE_TYPE_MAP[primitive] || null;
}

/**
 * Check if a type is a compact type
 *
 * @param type - Type to check
 * @param registry - Portable registry
 * @returns Whether the type is a compact type
 */
function isCompactType(type: PortableType, registry: PortableRegistry): boolean {
  if (type.typeDef.type !== 'Compact') {
    return false;
  }

  const innerType = registry.findType(type.typeDef.value.typeParam);
  return innerType.typeDef.type === 'Primitive';
}

/**
 * Get compact type tag for a type
 *
 * @param type - Type to get compact tag for
 * @param registry - Portable registry
 * @returns Compact type tag or null if not a compact
 */
function getCompactTypeTag(type: PortableType, registry: PortableRegistry): TypeRef['type'] | null {
  if (type.typeDef.type !== 'Compact') {
    return null;
  }

  const innerType = registry.findType(type.typeDef.value.typeParam);
  if (innerType.typeDef.type !== 'Primitive') {
    return null;
  }

  const primitive = innerType.typeDef.value.kind;
  return COMPACT_TYPE_MAP[primitive] || null;
}

/**
 * Check if a type is a void type (empty composite or tuple)
 *
 * @param type - Type to check
 * @param registry - Portable registry
 * @returns Whether the type is a void type
 */
function isVoidType(type: PortableType, registry: PortableRegistry): boolean {
  if (type.typeDef.type === 'Struct') {
    return type.typeDef.value.fields.length === 0;
  }

  if (type.typeDef.type === 'Tuple') {
    return type.typeDef.value.fields.length === 0;
  }

  return false;
}

/**
 * Get accessible types from metadata
 *
 * @param metadata - Metadata
 * @returns Map of type IDs to their positions
 */
export function getAccessibleTypes(metadata: Metadata): Map<number, number> {
  const registry = new PortableRegistry(metadata.latest);
  const types = new Set<number>();

  // Helper function to collect types recursively
  const collectTypesFromId = (id: number) => {
    if (types.has(id)) return;

    const type = registry.findType(id);
    const { typeDef } = type;

    if (typeDef.type === 'Struct') {
      if (typeDef.value.fields.length === 0) return;

      types.add(id);
      typeDef.value.fields.forEach((field) => {
        collectTypesFromId(field.typeId);
      });
    } else if (typeDef.type === 'Enum') {
      if (typeDef.value.members.length === 0) return;

      types.add(id);
      typeDef.value.members.forEach((variant) => {
        variant.fields.forEach((field) => {
          collectTypesFromId(field.typeId);
        });
      });
    } else if (typeDef.type === 'Tuple') {
      if (typeDef.value.fields.length === 0) return;

      types.add(id);
      typeDef.value.fields.forEach(collectTypesFromId);
    } else if (typeDef.type === 'Sequence') {
      types.add(id);
      collectTypesFromId(typeDef.value.typeParam);
    } else if (typeDef.type === 'SizedVec') {
      types.add(id);
      collectTypesFromId(typeDef.value.typeParam);
    } else if (typeDef.type === 'BitSequence') {
      types.add(id);
    }
    // Primitive and compact types are not stored
  };

  // Collect types from extrinsic metadata
  collectTypesFromId(metadata.latest.extrinsic.callTypeId);
  collectTypesFromId(metadata.latest.extrinsic.addressTypeId);
  collectTypesFromId(metadata.latest.extrinsic.signatureTypeId);

  metadata.latest.extrinsic.signedExtensions.forEach((ext) => {
    collectTypesFromId(ext.typeId);
    collectTypesFromId(ext.additionalSigned);
  });

  // Sort types by ID
  const sortedTypes = [...types].sort((a, b) => a - b);

  // Create map of type IDs to their positions
  return new Map(sortedTypes.map((value, idx) => [value, idx]));
}

/**
 * Generate TypeRef for a type
 *
 * @param frameId - Frame metadata type ID
 * @param registry - Portable registry
 * @param accessibleTypes - Map of accessible types
 * @returns TypeRef
 */
export function generateTypeRef(
  frameId: number,
  registry: PortableRegistry,
  accessibleTypes: Map<number, number>,
): TypeRef {
  const type = registry.findType(frameId);

  // Check for primitive type
  const primitiveTag = getPrimitiveTypeTag(type, registry);
  if (primitiveTag) {
    if (primitiveTag === 'perId') {
      throw new Error('Invalid primitive type: perId');
    }
    return { type: primitiveTag } as TypeRef;
  }

  // Check for compact type
  const compactTag = getCompactTypeTag(type, registry);
  if (compactTag) {
    if (compactTag === 'perId') {
      throw new Error('Invalid compact type: perId');
    }
    return { type: compactTag } as TypeRef;
  }

  // Check for void type
  if (isVoidType(type, registry)) {
    return { type: 'void' } as TypeRef;
  }

  // Check if type is accessible
  if (accessibleTypes.has(frameId)) {
    return { type: 'perId', value: accessibleTypes.get(frameId)! };
  }

  // Default to void for types that should be filtered out
  return { type: 'void' } as TypeRef;
}

/**
 * Convert field from portable type to RFC format
 *
 * @param field - Portable field
 * @param registry - Portable registry
 * @param accessibleTypes - Map of accessible types
 * @returns Field in RFC format
 */
function convertField(
  field: { name?: string; typeId: number; typeName?: string },
  registry: PortableRegistry,
  accessibleTypes: Map<number, number>,
): Field {
  return {
    name: field.name,
    ty: generateTypeRef(field.typeId, registry, accessibleTypes),
    typeName: field.typeName,
  };
}

/**
 * Generate type definitions from metadata
 *
 * @param metadata - Metadata
 * @param accessibleTypes - Map of accessible types
 * @returns Array of type information
 */
export function generateTypeDefinitions(metadata: Metadata, accessibleTypes: Map<number, number>): TypeInfo[] {
  const registry = new PortableRegistry(metadata.latest);
  const typeTree: TypeInfo[] = [];

  // Process each accessible type
  for (const [frameId, typeId] of accessibleTypes.entries()) {
    const type = registry.findType(frameId);
    const path = type.path;

    // Convert type definition based on its kind
    if (type.typeDef.type === 'Struct') {
      const fields = type.typeDef.value.fields.map((field) => convertField(field, registry, accessibleTypes));

      typeTree.push({
        path,
        typeId,
        typeDef: { type: 'composite', value: fields },
      });
    } else if (type.typeDef.type === 'Enum') {
      // For variants, create a separate type info for each variant
      type.typeDef.value.members.forEach((variant) => {
        const fields = variant.fields.map((field) => convertField(field, registry, accessibleTypes));

        typeTree.push({
          path,
          typeId,
          typeDef: {
            type: 'enumeration',
            value: {
              name: variant.name,
              fields,
              index: variant.index,
            },
          },
        });
      });
    } else if (type.typeDef.type === 'Sequence') {
      typeTree.push({
        path,
        typeId,
        typeDef: {
          type: 'sequence',
          value: generateTypeRef(type.typeDef.value.typeParam, registry, accessibleTypes),
        },
      });
    } else if (type.typeDef.type === 'SizedVec') {
      const arrayDef = type.typeDef.value;
      typeTree.push({
        path,
        typeId,
        typeDef: {
          type: 'array',
          value: {
            len: arrayDef.len,
            typeParam: generateTypeRef(arrayDef.typeParam, registry, accessibleTypes),
          },
        },
      });
    } else if (type.typeDef.type === 'Tuple') {
      const types = type.typeDef.value.fields.map((t) => generateTypeRef(t, registry, accessibleTypes));

      typeTree.push({
        path,
        typeId,
        typeDef: { type: 'tuple', value: types },
      });
    } else if (type.typeDef.type === 'BitSequence') {
      // For bit sequence, we need to determine the storage type
      const bitStorageType = type.typeDef.value.bitStoreType;
      const bitOrderType = type.typeDef.value.bitOrderType;

      // Get the primitive type for bit storage
      const storageType = registry.findType(bitStorageType);
      const numBytes =
        storageType.typeDef.type === 'Primitive' ? parseInt(storageType.typeDef.value.kind.replace('u', '')) / 8 : 1;

      // Determine bit order from the type path
      const orderType = registry.findType(bitOrderType);
      const leastSignificantBitFirst = orderType.path.some((p) => p.includes('Lsb0'));

      typeTree.push({
        path,
        typeId,
        typeDef: {
          type: 'bitSequence',
          value: {
            numBytes,
            leastSignificantBitFirst,
          },
        },
      });
    }
  }

  // Sort the type tree
  typeTree.sort((a, b) => {
    if (a.typeId !== b.typeId) {
      return a.typeId - b.typeId;
    }

    // For enumerations with the same typeId, sort by variant index
    if (a.typeDef.type === 'enumeration' && b.typeDef.type === 'enumeration') {
      return a.typeDef.value.index - b.typeDef.value.index;
    }

    return 0;
  });

  return typeTree;
}

/**
 * Generate extrinsic metadata from metadata
 *
 * @param metadata - Metadata
 * @param accessibleTypes - Map of accessible types
 * @returns Extrinsic metadata
 */
export function generateExtrinsicMetadata(metadata: Metadata, accessibleTypes: Map<number, number>): ExtrinsicMetadata {
  const registry = new PortableRegistry(metadata.latest);
  const extrinsic = metadata.latest.extrinsic;

  return {
    version: extrinsic.version,
    addressTy: generateTypeRef(extrinsic.addressTypeId, registry, accessibleTypes),
    callTy: generateTypeRef(extrinsic.callTypeId, registry, accessibleTypes),
    signatureTy: generateTypeRef(extrinsic.signatureTypeId, registry, accessibleTypes),
    signedExtensions: extrinsic.signedExtensions.map((ext) => ({
      identifier: ext.ident,
      includedInExtrinsic: generateTypeRef(ext.typeId, registry, accessibleTypes),
      includedInSignedData: generateTypeRef(ext.additionalSigned, registry, accessibleTypes),
    })),
  };
}

/**
 * Transform metadata to RFC format
 *
 * @param metadata - Metadata
 * @returns Transformed metadata
 */
export function transformMetadata(metadata: Metadata): {
  typeInfo: TypeInfo[];
  extrinsicMetadata: ExtrinsicMetadata;
} {
  // Get accessible types
  const accessibleTypes = getAccessibleTypes(metadata);

  // Generate type definitions
  const typeInfo = generateTypeDefinitions(metadata, accessibleTypes);

  // Generate extrinsic metadata
  const extrinsicMetadata = generateExtrinsicMetadata(metadata, accessibleTypes);

  return {
    typeInfo,
    extrinsicMetadata,
  };
}
