import { beforeEach, describe, expect, it } from 'vitest';
import { $Metadata } from '../../codecs';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';
import { PortableRegistry } from '../PortableRegistry';
import * as $ from '@dedot/shape';
import * as util from 'util';

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
          type: { tag: 'SizedVec', value: { len: 32, typeParam: 2 } },
        });

        expect(registry.findType(2)).toMatchObject({
          id: 2,
          type: { tag: 'Primitive', value: { kind: 'u8' } },
        });

        expect(registry.findType(4)).toMatchObject({
          id: 4,
          type: { tag: 'Primitive', value: { kind: 'u32' } },
        });
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findType(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });
  });
});
