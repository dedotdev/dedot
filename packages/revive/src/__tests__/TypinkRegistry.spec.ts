import * as util from 'node:util';
import { beforeEach, describe, expect, it } from 'vitest';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { INK_FLIPPER_CONTRACT_METADATA_V6 } from './contracts-metadata';

describe('TypinkRegistry', () => {
  describe('with metadata', () => {
    let registry: TypinkRegistry;

    beforeEach(() => {
      registry = new TypinkRegistry(INK_FLIPPER_CONTRACT_METADATA_V6);
    });

    it('should have metadata', () => {
      expect(registry.metadata).toBeDefined();
    });

    describe('findCodec', () => {
      it('should find existing codec', () => {
        expect(util.inspect(registry.findCodec(2))).toEqual(
          "$.Result($.tuple([]), $.literalUnion({ '1': 'CouldNotReadInput' }))",
        );
        expect(util.inspect(registry.findCodec(3))).toEqual('$.tuple([])');
        expect(util.inspect(registry.findCodec(10))).toEqual('$.hex($.sizedUint8Array(32))');
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findCodec(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('findType', () => {
      it('should find existing codec type', () => {
        expect(registry.findType(11)).toMatchObject({
          id: 11,
          typeDef: { type: 'Primitive', value: { kind: 'u64' } },
        });
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findType(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });
  });
});
