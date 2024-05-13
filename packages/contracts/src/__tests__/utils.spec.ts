import { TypeDef } from '@dedot/codecs';
import { describe, expect, it } from 'vitest';
import { Def} from '../types';
import {extractContractTypes, normalizeContractTypeDef, parseRawMetadata} from '../utils';
// @ts-ignore
import flipperRaw from './flipper.json' assert { type: "json" };

describe('utils', () => {
  describe('normalizeContractTypeDef', () => {
    it('returns correct TypeDef for variant def', () => {
      const def: Def = {
        variant: {
          variants: [
            {
              fields: [
                {
                  type: 12,
                  typeName: 'String',
                },
              ],
              index: 0,
              name: 'Contains value',
            },
            {
              index: 1,
              name: 'Not contains',
            },
          ],
        },
      };

      const result = normalizeContractTypeDef(def) as TypeDef & { tag: 'Enum' };

      expect(result.tag).toBe('Enum');
      expect(result.value.members[0].name).toEqual('Contains value');
      expect(result.value.members[0].fields[0].typeId).toEqual(12);
      expect(result.value.members[0].fields[0].typeName).toEqual('String');

      expect(result.value.members[1].name).toEqual('Not contains');
      expect(result.value.members[1].fields).toEqual([]);
    });

    it('returns correct TypeDef for tuple def', () => {
      const def: Def = { tuple: [1, 2] };
      const result = normalizeContractTypeDef(def) as TypeDef & { tag: 'Tuple' };

      expect(result.tag).toBe('Tuple');
      expect(result.value.fields).toEqual([1, 2]);
    });

    it('returns correct TypeDef for sequence def', () => {
      const def: Def = { sequence: { type: 1 } };
      const result = normalizeContractTypeDef(def) as TypeDef & { tag: 'Sequence' };

      expect(result.tag).toEqual('Sequence');
      expect(result.value.typeParam).toEqual(1);
    });

    it('returns correct TypeDef for composite def', () => {
      const def: Def = { composite: { fields: [{ name: 'test', type: 1, typeName: 'Test' }] } };
      const result = normalizeContractTypeDef(def) as TypeDef & { tag: 'Struct' };

      expect(result.tag).toBe('Struct');
      expect(result.value.fields[0].name).toEqual('test');
      expect(result.value.fields[0].typeId).toEqual(1);
      expect(result.value.fields[0].typeName).toEqual('Test');
    });

    it('returns correct TypeDef for primitive def', () => {
      const def: Def = { primitive: 'u8' };
      const result = normalizeContractTypeDef(def) as TypeDef & { tag: 'Primitive' };

      expect(result.tag).toBe('Primitive');
      expect(result.value.kind).toEqual('u8');
    });

    it('returns correct TypeDef for array def', () => {
      const def: Def = { array: { len: 5, type: 1 } };
      const result = normalizeContractTypeDef(def) as TypeDef & { tag: 'SizedVec' };

      expect(result.tag).toBe('SizedVec');
      expect(result.value.len).toBe(5);
    });

    it('throws error for invalid def', () => {
      const def = { invalid: {} };
      expect(() => normalizeContractTypeDef(def as Def)).toThrow();
    });
  });
  describe('extractContractTypes', () => {
    it('returns correct PortableType array for valid ContractMetadata', () => {
      const flipper = parseRawMetadata(JSON.stringify(flipperRaw));

      const result = extractContractTypes(parseRawMetadata(JSON.stringify(flipperRaw)));
      expect(result).toHaveLength(flipper.types.length);
      expect(result[0]).toHaveProperty('id', flipper.types[0].id);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('params');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('docs');
    });
  });
});