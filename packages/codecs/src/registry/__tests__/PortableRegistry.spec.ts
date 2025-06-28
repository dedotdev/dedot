import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';
import * as $ from '@dedot/shape';
import * as util from 'util';
import { beforeEach, describe, expect, it } from 'vitest';
import { $Metadata } from '../../metadata/index.js';
import { PortableRegistry } from '../PortableRegistry.js';

describe('PortableRegistry', () => {
  describe('with metadata', () => {
    const metadata = $Metadata.tryDecode(staticSubstrate);
    let registry: PortableRegistry;

    beforeEach(() => {
      registry = new PortableRegistry(metadata.latest);
    });

    it('should have metadata', () => {
      expect(registry.metadata).toBeDefined();
    });

    describe('findCodec', () => {
      it('should find existing codec', () => {
        expect(util.inspect(registry.findCodec(1))).toEqual('$.hex($.sizedUint8Array(32))');
        expect(registry.findCodec(2)).toEqual($.u8);
        expect(registry.findCodec(4)).toEqual($.u32);
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findCodec(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('findType', () => {
      it('should find existing codec type', () => {
        expect(registry.findType(1)).toMatchObject({
          id: 1,
          typeDef: { type: 'SizedVec', value: { len: 32, typeParam: 2 } },
        });

        expect(registry.findType(2)).toMatchObject({
          id: 2,
          typeDef: { type: 'Primitive', value: { kind: 'u8' } },
        });

        expect(registry.findType(4)).toMatchObject({
          id: 4,
          typeDef: { type: 'Primitive', value: { kind: 'u32' } },
        });
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findType(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('findErrorMeta', () => {
      it('should return undefined for non-module dispatch error', () => {
        const dispatchError = { type: 'Other' } as any;
        expect(registry.findErrorMeta(dispatchError)).toBeUndefined();
      });

      it('should return error metadata for a valid module error', () => {
        const moduleError = { index: 10, error: '0x04000000' as const }; // PalletId 10, ErrorId 4
        const errorMeta = registry.findErrorMeta(moduleError);

        expect(errorMeta).toBeDefined();
        expect(errorMeta!.pallet).toEqual('ElectionProviderMultiPhase');
        expect(errorMeta!.name).toEqual('SignedCannotPayDeposit');
      });

      it('should return undefined for a non-existent pallet index', () => {
        const moduleError = { index: 999, error: '0x00' as const };
        expect(registry.findErrorMeta(moduleError)).toBeUndefined();
      });

      it('should return undefined for a non-existent error index within a pallet', () => {
        const moduleError = { index: 10, error: '0x99' as const };
        expect(registry.findErrorMeta(moduleError)).toBeUndefined();
      });
    });
  });
});
