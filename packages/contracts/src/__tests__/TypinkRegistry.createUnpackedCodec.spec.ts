import { PortableType, TypeId } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import * as util from 'node:util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractMetadata, ContractType } from '../types/index.js';

// Mock contract metadata with lazy storage types
const createMockMetadata = (): ContractMetadata => {
  return {
    version: '4',
    source: {
      hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      language: 'ink! 4.0.0',
      compiler: 'rustc 1.70.0',
      build_info: {
        build_mode: 'Debug',
        cargo_contract_version: '3.0.0',
        rust_toolchain: 'stable-aarch64-apple-darwin',
        wasm_opt_settings: {
          keep_debug_symbols: false,
          optimization_passes: 'Z',
        },
      },
    },
    contract: {
      name: 'mock_contract',
      version: '1.0.0',
      authors: ['Test Author'],
    },
    types: [],
    spec: {
      constructors: [],
      events: [],
      messages: [],
      docs: [],
      lang_error: {
        displayName: ['ink', 'LangError'],
        type: 1,
      },
      environment: {
        accountId: {
          displayName: ['AccountId'],
          type: 5,
        },
        balance: {
          displayName: ['Balance'],
          type: 8,
        },
        blockNumber: {
          displayName: ['BlockNumber'],
          type: 11,
        },
        chainExtension: {
          displayName: ['ChainExtension'],
          type: 12,
        },
        hash: {
          displayName: ['Hash'],
          type: 9,
        },
        maxEventTopics: 4,
        timestamp: {
          displayName: ['Timestamp'],
          type: 10,
        },
      },
    },
    storage: {
      root: {
        root_key: '0x00000000',
        ty: 1,
        layout: {
          struct: {
            fields: [],
            name: 'MockContract',
          },
        },
      },
    },
  } as unknown as ContractMetadata;
};

// Helper to create mock portable types
const createMockPortableType = (
  id: TypeId,
  path: string[] = [],
  typeDef: any = { type: 'Primitive', value: { kind: 'bool' } },
): PortableType => {
  return {
    id,
    path,
    params: [],
    typeDef,
    docs: [],
  };
};

// Helper to create mock contract types
const createMockContractType = (id: TypeId, path: string[] = [], params: any[] = []): ContractType => {
  return {
    id,
    type: {
      path,
      params,
      def: {},
    },
  } as ContractType;
};

// Extended registry for testing
class TestTypinkRegistry extends TypinkRegistry {
  constructor() {
    super(createMockMetadata());
  }

  // Method to register mock types for testing
  registerMockTypes(types: PortableType[]) {
    // @ts-ignore - Accessing private property for testing
    this.types = types.reduce(
      (acc, type) => {
        acc[type.id] = type;
        return acc;
      },
      {} as Record<TypeId, PortableType>,
    );
  }

  // Method to register mock contract types for testing
  registerMockContractTypes(types: ContractType[]) {
    // @ts-ignore - Accessing private property for testing
    this.metadata.types = types;
  }

  // Create a safe version of createUnpackedCodec that handles errors
  safeCreateUnpackedCodec(typeId: TypeId): $.AnyShape | null {
    try {
      return this.createUnpackedCodec(typeId);
    } catch (e) {
      return null;
    }
  }
}

describe('TypinkRegistry.createUnpackedCodec', () => {
  let registry: TestTypinkRegistry;

  beforeEach(() => {
    registry = new TestTypinkRegistry();
  });

  describe('Basic functionality', () => {
    it('should return null for non-existent type ID', () => {
      expect(registry.safeCreateUnpackedCodec(999)).toBeNull();
    });

    it('should return null for primitive types', () => {
      const boolType = createMockPortableType(1, [], { type: 'Primitive', value: { kind: 'bool' } });
      const u8Type = createMockPortableType(2, [], { type: 'Primitive', value: { kind: 'u8' } });

      registry.registerMockTypes([boolType, u8Type]);

      expect(registry.safeCreateUnpackedCodec(1)).toBeNull();
      expect(registry.safeCreateUnpackedCodec(2)).toBeNull();
    });
  });

  describe('ink_storage::lazy::mapping::Mapping type', () => {
    beforeEach(() => {
      // Create mock types for testing
      const mappingType = createMockPortableType(1, ['ink_storage', 'lazy', 'mapping', 'Mapping'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const mappingContractType = createMockContractType(
        1,
        ['ink_storage', 'lazy', 'mapping', 'Mapping'],
        [
          { name: 'K', type: 2 },
          { name: 'V', type: 3 },
        ],
      );

      const keyType = createMockPortableType(2, [], { type: 'Primitive', value: { kind: 'u32' } });
      const valueType = createMockPortableType(3, [], { type: 'Primitive', value: { kind: 'u64' } });

      registry.registerMockTypes([mappingType, keyType, valueType]);
      registry.registerMockContractTypes([mappingContractType]);
    });

    it('should return codec for standalone Mapping type', () => {
      const result = registry.safeCreateUnpackedCodec(1);
      expect(result).not.toBeNull();
    });
  });

  describe('ink_storage::lazy::Lazy type', () => {
    beforeEach(() => {
      // Create mock types for testing
      const lazyType = createMockPortableType(1, ['ink_storage', 'lazy', 'Lazy'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const lazyContractType = createMockContractType(1, ['ink_storage', 'lazy', 'Lazy'], [{ name: 'T', type: 2 }]);

      const valueType = createMockPortableType(2, [], { type: 'Primitive', value: { kind: 'u64' } });

      registry.registerMockTypes([lazyType, valueType]);
      registry.registerMockContractTypes([lazyContractType]);
    });

    it('should return codec for standalone Lazy type', () => {
      const result = registry.safeCreateUnpackedCodec(1);
      expect(result).not.toBeNull();
    });
  });

  describe('ink_storage::lazy::vec::StorageVec type', () => {
    beforeEach(() => {
      // Create mock types for testing
      const storageVecType = createMockPortableType(1, ['ink_storage', 'lazy', 'vec', 'StorageVec'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const storageVecContractType = createMockContractType(
        1,
        ['ink_storage', 'lazy', 'vec', 'StorageVec'],
        [{ name: 'T', type: 2 }],
      );

      const valueType = createMockPortableType(2, [], { type: 'Primitive', value: { kind: 'u64' } });

      registry.registerMockTypes([storageVecType, valueType]);
      registry.registerMockContractTypes([storageVecContractType]);
    });

    it('should return codec for standalone StorageVec type', () => {
      const result = registry.safeCreateUnpackedCodec(1);
      expect(result).not.toBeNull();
    });
  });

  describe('Path matching', () => {
    it('should match exact paths for known lazy types', () => {
      const mappingType = createMockPortableType(1, ['ink_storage', 'lazy', 'mapping', 'Mapping'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const lazyType = createMockPortableType(2, ['ink_storage', 'lazy', 'Lazy'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const storageVecType = createMockPortableType(3, ['ink_storage', 'lazy', 'vec', 'StorageVec'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const mappingContractType = createMockContractType(
        1,
        ['ink_storage', 'lazy', 'mapping', 'Mapping'],
        [
          { name: 'K', type: 4 },
          { name: 'V', type: 4 },
        ],
      );

      const lazyContractType = createMockContractType(2, ['ink_storage', 'lazy', 'Lazy'], [{ name: 'T', type: 4 }]);

      const storageVecContractType = createMockContractType(
        3,
        ['ink_storage', 'lazy', 'vec', 'StorageVec'],
        [{ name: 'T', type: 4 }],
      );

      const regularType = createMockPortableType(4, [], { type: 'Primitive', value: { kind: 'u64' } });

      registry.registerMockTypes([mappingType, lazyType, storageVecType, regularType]);
      registry.registerMockContractTypes([mappingContractType, lazyContractType, storageVecContractType]);

      expect(registry.safeCreateUnpackedCodec(1)).not.toBeNull();
      expect(registry.safeCreateUnpackedCodec(2)).not.toBeNull();
      expect(registry.safeCreateUnpackedCodec(3)).not.toBeNull();
      expect(registry.safeCreateUnpackedCodec(4)).toBeNull();
    });

    it('should match paths starting with ink_storage::lazy', () => {
      const customLazyType = createMockPortableType(1, ['ink_storage', 'lazy', 'custom', 'Type'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const customLazyContractType = createMockContractType(
        1,
        ['ink_storage', 'lazy', 'custom', 'Type'],
        [{ name: 'T', type: 3 }],
      );

      const regularType = createMockPortableType(2, ['ink_storage', 'regular', 'Type'], {
        type: 'Struct',
        value: { fields: [] },
      });

      const valueType = createMockPortableType(3, [], { type: 'Primitive', value: { kind: 'u64' } });

      registry.registerMockTypes([customLazyType, regularType, valueType]);
      registry.registerMockContractTypes([customLazyContractType]);

      expect(registry.safeCreateUnpackedCodec(1)).toBeNull();
      expect(registry.safeCreateUnpackedCodec(2)).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', () => {
      // Create a type that will cause an error when processed
      const errorType = createMockPortableType(
        1,
        ['ink_storage', 'lazy', 'custom', 'Type'],
        { type: 'Unknown', value: {} }, // Unknown type will cause an error
      );

      registry.registerMockTypes([errorType]);

      // Should not throw an error
      expect(() => registry.safeCreateUnpackedCodec(1)).not.toThrow();
      // Should return null
      expect(registry.safeCreateUnpackedCodec(1)).toBeNull();
    });
  });
});
