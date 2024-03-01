import { beforeEach, describe, expect, it } from 'vitest';
import { $AccountId20, $AccountId32, $Hash, $Metadata, $MetadataV14, $StorageKey } from '../../codecs';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';
import { CodecRegistry } from '../CodecRegistry';
import * as $ from '@dedot/shape';
import * as util from 'util';

describe('CodecRegistry', () => {
  describe('with no metadata', () => {
    let registry: CodecRegistry;
    beforeEach(() => {
      registry = new CodecRegistry();
    });

    it('should have no metadata', () => {
      expect(registry.metadata).toBeUndefined();
      expect(registry.portableRegistry).toBeUndefined();
    });

    it('findPortableCodec / should throws error', () => {
      expect(() => {
        registry.findPortableCodec(1);
      }).toThrowError();
    });

    it('findPortableType / should throws error', () => {
      expect(() => {
        registry.findPortableType(1);
      }).toThrowError();
    });
  });

  describe('with metadata', () => {
    const metadata = $Metadata.tryDecode(staticSubstrate);
    let registry: CodecRegistry;

    beforeEach(() => {
      registry = new CodecRegistry(metadata.latest);
    });

    it('should have metadata', () => {
      expect(registry.metadata).toBeDefined();
      expect(registry.portableRegistry).toBeDefined();
    });

    describe('findCodec', () => {
      it('should find known codec by name', () => {
        expect(registry.findCodec('AccountId32')).toEqual($AccountId32);
        expect(registry.findCodec('AccountId20')).toEqual($AccountId20);
        expect(registry.findCodec('Metadata')).toEqual($Metadata);
        expect(registry.findCodec('MetadataV14')).toEqual($MetadataV14);
      });

      it('should find basic shape codecs', () => {
        expect(registry.findCodec('u32')).toEqual($.u32);
        expect(registry.findCodec('u64')).toEqual($.u64);
        expect(registry.findCodec('option')).toEqual($.option);
        expect(registry.findCodec('Tuple')).toEqual($.Tuple);
        expect(registry.findCodec('Struct')).toEqual($.Struct);
      });

      it('should supports wrapper type', () => {
        expect(util.inspect(registry.findCodec('Option<u32>'))).toEqual('$.option($.u32)');
        expect(util.inspect(registry.findCodec('Vec<u32>'))).toEqual('$.array($.u32)');
        expect(util.inspect(registry.findCodec('Result<u32, bool>'))).toEqual('$.Result($.u32, $.bool)');
        expect(util.inspect(registry.findCodec('Array<u32>'))).toEqual('$.array($.u32)');
        expect(util.inspect(registry.findCodec('Array<[u32, u32]>'))).toEqual('$.array($.tuple($.u32, $.u32))');
        expect(util.inspect(registry.findCodec('[]'))).toEqual('$.tuple([])');
        expect(util.inspect(registry.findCodec('[u32, bool]'))).toEqual('$.tuple($.u32, $.bool)');
        expect(util.inspect(registry.findCodec('Array<Array<[u32, u32]>>'))).toEqual(
          '$.array($.array($.tuple($.u32, $.u32)))',
        );
      });

      it('should throws error for not existing codec', () => {
        expect(() => registry.findCodec('NotExist')).toThrowError(new Error(`Unsupported codec - NotExist`));
      });
    });

    describe('findCodecType', () => {
      it('should find known codec type', () => {
        expect(registry.findCodecType('StorageKey')).toEqual({
          name: '$StorageKey',
          $codec: $StorageKey,
          typeIn: 'StorageKeyLike',
          typeOut: 'StorageKey',
        });
      });

      it('should find basic known codec', () => {
        expect(registry.findCodecType('Hash')).toEqual({
          name: '$Hash',
          $codec: $Hash,
          typeIn: 'Hash',
          typeOut: 'Hash',
        });
      });
    });

    describe('findPortableCodec', () => {
      it('should find existing codec', () => {
        expect(util.inspect(registry.findPortableCodec(1))).toEqual('$.hex($.sizedUint8Array(32))');
        expect(registry.findPortableCodec(2)).toEqual($.u8);
        expect(registry.findPortableCodec(4)).toEqual($.u32);
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findPortableCodec(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('findPortableType', () => {
      it('should find existing codec type', () => {
        expect(registry.findPortableType(1)).toMatchObject({
          id: 1,
          type: { tag: 'SizedVec', value: { len: 32, typeParam: 2 } },
        });

        expect(registry.findPortableType(2)).toMatchObject({
          id: 2,
          type: { tag: 'Primitive', value: { kind: 'u8' } },
        });

        expect(registry.findPortableType(4)).toMatchObject({
          id: 4,
          type: { tag: 'Primitive', value: { kind: 'u32' } },
        });
      });

      it('should throw error for non-existing codec type id', () => {
        expect(() => registry.findPortableType(1_000_000)).toThrowError('Cannot find portable type for id: 1000000');
      });
    });

    describe('isKnownType', () => {
      it('should match known type', () => {
        expect(registry.isKnownType(['sp_core', 'crypto', 'AccountId32'])).toEqual(true);
        expect(registry.isKnownType('sp_core::crypto::AccountId32')).toEqual(true);

        expect(registry.isKnownType(['primitive_types', 'H256'])).toEqual(true);
        expect(registry.isKnownType('primitive_types::H256')).toEqual(true);

        expect(registry.isKnownType(['sp_arithmetic', 'per_things', 'Perbill'])).toEqual(true);
        expect(registry.isKnownType('sp_arithmetic::per_things::Perbill')).toEqual(true);
      });
    });
  });
});
