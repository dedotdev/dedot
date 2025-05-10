import { Metadata, PortableRegistry } from '@dedot/codecs';
import { ExtrinsicMetadata, Field, TypeInfo, TypeRef } from '../codecs';
import { getAccessibleTypes } from './accessibleTypes';
import { getCompactTypeTag, getPrimitiveTypeTag } from './typeUtils';

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
  if (type.typeDef.type === 'Primitive') {
    const primitive = type.typeDef.value.kind;
    return { type: PRIMITIVE_TYPE_MAP[primitive] } as TypeRef;
  }

  // Check for compact type
  const compactTag = getCompactTypeTag(type, registry);
  if (compactTag) {
    if (compactTag === 'perId') {
      throw new Error('Invalid compact type: perId');
    }
    return { type: compactTag } as TypeRef;
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
    typeName: field.typeName,
    name: field.name,
    ty: generateTypeRef(field.typeId, registry, accessibleTypes),
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

// Import this at the end to avoid circular dependencies
import { PRIMITIVE_TYPE_MAP } from './typeUtils';
