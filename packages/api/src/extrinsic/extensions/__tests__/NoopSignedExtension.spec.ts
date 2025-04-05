import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { knownSignedExtensions } from '../known/index.js';
import { ExtraSignedExtension } from '../ExtraSignedExtension.js';
import { NoopSignedExtension, isEmptyStructOrTuple } from '../NoopSignedExtension.js';

describe('isEmptyStructOrTuple', () => {
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
    expect(isEmptyStructOrTuple(mockRegistry, 1)).toBe(true);
  });

  it('should return false for non-empty struct', () => {
    expect(isEmptyStructOrTuple(mockRegistry, 2)).toBe(false);
  });

  it('should return true for empty tuple', () => {
    expect(isEmptyStructOrTuple(mockRegistry, 3)).toBe(true);
  });

  it('should return false for non-empty tuple', () => {
    expect(isEmptyStructOrTuple(mockRegistry, 4)).toBe(false);
  });

  it('should return false for other types', () => {
    expect(isEmptyStructOrTuple(mockRegistry, 5)).toBe(false);
  });

  it('should return false when type is not found', () => {
    expect(isEmptyStructOrTuple(mockRegistry, 999)).toBe(false);
  });
});

describe('NoopSignedExtension', () => {
  // Save original extensions
  const originalExtensions = { ...knownSignedExtensions };
  const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Mock client and registry
  const mockRegistry = {
    metadata: {
      extrinsic: {
        signedExtensions: [
          { ident: 'CheckNonZeroSender', typeId: 1, additionalSigned: 2 },
          { ident: 'CheckWeight', typeId: 3, additionalSigned: 4 },
          { ident: 'UnknownExtension', typeId: 5, additionalSigned: 6 },
        ],
        extraTypeId: 7,
      },
    },
    findCodec: (typeId: number) => {
      // Mock implementation to simulate empty/trivial types
      if (typeId === 5 || typeId === 6) {
        return {
          metadata: [{ name: '$.Struct' }],
          tryEncode: () => new Uint8Array(),
        };
      }
      return {
        metadata: [{ name: '$.Struct' }],
        tryEncode: () => new Uint8Array(),
      };
    },
    findType: (typeId: number) => {
      // Mock implementation to simulate empty/trivial types
      if (typeId === 1 || typeId === 2 || typeId === 3 || typeId === 4 || typeId === 5 || typeId === 6) {
        // Make all extension types empty structs (no input required)
        return {
          typeDef: {
            type: 'Struct',
            value: {
              fields: [],
            },
          },
        };
      }
      return {
        typeDef: {
          type: 'Struct',
          value: {
            fields: [{ name: 'field1', typeId: 100 }],
          },
        },
      };
    },
  };

  const mockClient = {
    registry: mockRegistry,
    options: {},
  };

  beforeAll(() => {
    // Remove CheckNonZeroSender and CheckWeight for testing
    delete knownSignedExtensions.CheckNonZeroSender;
    delete knownSignedExtensions.CheckWeight;
  });

  afterAll(() => {
    // Restore original extensions
    Object.assign(knownSignedExtensions, originalExtensions);
    mockConsoleWarn.mockRestore();
  });

  it('should use NoopSignedExtension for unknown extensions that do not require input', async () => {
    const extraSignedExtension = new ExtraSignedExtension(mockClient as any, {
      signerAddress: '0x123',
    });

    // This should not throw an error
    await extraSignedExtension.init();

    // Check that console.warn was called for the unknown extension
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('SignedExtension for UnknownExtension not found, using NoopSignedExtension')
    );

    // Check that the extensions were initialized correctly
    expect(extraSignedExtension.data.length).toBe(3);
    expect(extraSignedExtension.additionalSigned.length).toBe(3);
  });

  it('should throw an error for unknown extensions that require input', async () => {
    // Modify the mock to make only UnknownExtension require input
    const mockRegistryWithRequiredInput = {
      ...mockRegistry,
      findType: (typeId: number) => {
        // Make only UnknownExtension require input (typeId 5 and 6)
        if (typeId === 5 || typeId === 6) {
          return {
            typeDef: {
              type: 'Struct',
              value: {
                fields: [{ name: 'field1', typeId: 100 }],
              },
            },
          };
        }
        // Other extensions don't require input
        return {
          typeDef: {
            type: 'Struct',
            value: {
              fields: [],
            },
          },
        };
      },
    };

    const mockClientWithRequiredInput = {
      registry: mockRegistryWithRequiredInput,
      options: {},
    };

    const extraSignedExtension = new ExtraSignedExtension(mockClientWithRequiredInput as any, {
      signerAddress: '0x123',
    });

    // This should throw an error
    await expect(extraSignedExtension.init()).rejects.toThrow(
      'SignedExtension for UnknownExtension requires input but is not implemented'
    );
  });
});
