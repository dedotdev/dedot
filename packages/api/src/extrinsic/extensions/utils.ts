import { PortableRegistry } from '@dedot/codecs';

/**
 * Checks if a type is empty (doesn't require external input).
 * Currently only checks for empty structs and empty tuples.
 * 
 * @param registry The portable registry
 * @param typeId The type ID to check
 * @returns True if the type is empty, false otherwise
 */
export function isEmptyOrTrivialType(registry: PortableRegistry, typeId: number): boolean {
  try {
    const type = registry.findType(typeId);
    
    // Check if it's an empty struct
    if (type.typeDef.type === 'Struct' && type.typeDef.value.fields.length === 0) {
      return true;
    }
    
    // Check if it's an empty tuple
    if (type.typeDef.type === 'Tuple' && type.typeDef.value.fields.length === 0) {
      return true;
    }
  } catch (error) {
    // Ignore errors
  }
  
  // All other cases (including errors) require input
  return false;
}
