import { Metadata, PortableRegistry } from '@dedot/codecs';

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

    // Primitive, compact & BitSequence types are not stored
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
