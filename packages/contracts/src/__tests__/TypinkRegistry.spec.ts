import * as util from 'node:util';
import { beforeEach, describe, expect, it } from 'vitest';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractMetadata } from '../types';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  FLIPPER_CONTRACT_METADATA_V6,
} from './contracts-metadata.js';

describe('TypinkRegistry', () => {
  describe('with metadata', () => {
    let registry: TypinkRegistry;

    beforeEach(() => {
      registry = new TypinkRegistry(FLIPPER_CONTRACT_METADATA_V4 as ContractMetadata);
    });

    it('should have metadata', () => {
      expect(registry.metadata).toBeDefined();
    });

    describe('findCodec', () => {
      it('should find existing codec', () => {
        expect(util.inspect(registry.findCodec(1))).toEqual(
          "$.Result($.tuple([]), $.literalUnion({ '1': 'CouldNotReadInput' }))",
        );
        expect(util.inspect(registry.findCodec(2))).toEqual('$.tuple([])');
        expect(util.inspect(registry.findCodec(10))).toEqual('$.u64');
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findCodec(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('findType', () => {
      it('should find existing codec type', () => {
        expect(registry.findType(10)).toMatchObject({
          id: 10,
          typeDef: { type: 'Primitive', value: { kind: 'u64' } },
        });
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findType(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('isRevive', () => {
      it('should work properly', () => {
        registry = new TypinkRegistry(FLIPPER_CONTRACT_METADATA_V4 as ContractMetadata);
        expect(registry.isRevive()).toBe(false);

        registry = new TypinkRegistry(FLIPPER_CONTRACT_METADATA_V5 as ContractMetadata);
        expect(registry.isRevive()).toBe(false);

        registry = new TypinkRegistry(FLIPPER_CONTRACT_METADATA_V6 as ContractMetadata);
        expect(registry.isRevive()).toBe(true);
      });
    });
  });
});
