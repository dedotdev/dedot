import { describe, expect, it } from 'vitest';
import { isEmptyOrTrivialType } from '../utils.js';

describe('isEmptyOrTrivialType', () => {
  // Mock registry with various type definitions
  const mockRegistry = {
    findType: (typeId: number) => {
      switch (typeId) {
        case 1: // Empty struct
          return {
            typeDef: {
              type: 'Struct',
              value: {
                fields: [],
              },
            },
          };
        case 2: // Non-empty struct
          return {
            typeDef: {
              type: 'Struct',
              value: {
                fields: [{ name: 'field1', typeId: 100 }],
              },
            },
          };
        case 3: // Empty tuple
          return {
            typeDef: {
              type: 'Tuple',
              value: {
                fields: [],
              },
            },
          };
        case 4: // Non-empty tuple
          return {
            typeDef: {
              type: 'Tuple',
              value: {
                fields: [200],
              },
            },
          };
        case 5: // Other type (Enum)
          return {
            typeDef: {
              type: 'Enum',
              value: {
                members: [],
              },
            },
          };
        default:
          throw new Error('Type not found');
      }
    },
  } as any;

  it('should return true for empty struct', () => {
    expect(isEmptyOrTrivialType(mockRegistry, 1)).toBe(true);
  });

  it('should return false for non-empty struct', () => {
    expect(isEmptyOrTrivialType(mockRegistry, 2)).toBe(false);
  });

  it('should return true for empty tuple', () => {
    expect(isEmptyOrTrivialType(mockRegistry, 3)).toBe(true);
  });

  it('should return false for non-empty tuple', () => {
    expect(isEmptyOrTrivialType(mockRegistry, 4)).toBe(false);
  });

  it('should return false for other types', () => {
    expect(isEmptyOrTrivialType(mockRegistry, 5)).toBe(false);
  });

  it('should return false when type is not found', () => {
    expect(isEmptyOrTrivialType(mockRegistry, 999)).toBe(false);
  });
});
