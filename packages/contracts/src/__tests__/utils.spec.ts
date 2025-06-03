import { TypeDef } from '@dedot/codecs';
import { describe, expect, it } from 'vitest';
import { ContractTypeDef, ReturnFlags } from '../types/index.js';
import { extractContractTypes, normalizeContractTypeDef, normalizeLabel, toReturnFlags } from '../utils/index.js';
import { FLIPPER_CONTRACT_METADATA_V4 } from './contracts-metadata.js';

describe('utils', () => {
  describe('normalizeContractTypeDef', () => {
    it('returns correct TypeDef for compact def', () => {
      const def: ContractTypeDef = { compact: { type: 1 } };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'Compact' };

      expect(result.type).toBe('Compact');
      expect(result.value.typeParam).toEqual(1);
    });

    it('returns correct TypeDef for bitsequence def', () => {
      const def: ContractTypeDef = { bitsequence: { bit_order_type: 0, bit_store_type: 1 } };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'BitSequence' };

      expect(result.type).toBe('BitSequence');
      expect(result.value.bitOrderType).toEqual(0);
      expect(result.value.bitStoreType).toEqual(1);
    });

    it('returns correct TypeDef for variant def', () => {
      const def: ContractTypeDef = {
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

      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'Enum' };

      expect(result.type).toBe('Enum');
      expect(result.value.members[0].name).toEqual('Contains value');
      expect(result.value.members[0].fields[0].typeId).toEqual(12);
      expect(result.value.members[0].fields[0].typeName).toEqual('String');

      expect(result.value.members[1].name).toEqual('Not contains');
      expect(result.value.members[1].fields).toEqual([]);
    });

    it('returns correct TypeDef for tuple def', () => {
      const def: ContractTypeDef = { tuple: [1, 2] };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'Tuple' };

      expect(result.type).toBe('Tuple');
      expect(result.value.fields).toEqual([1, 2]);
    });

    it('returns correct TypeDef for sequence def', () => {
      const def: ContractTypeDef = { sequence: { type: 1 } };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'Sequence' };

      expect(result.type).toEqual('Sequence');
      expect(result.value.typeParam).toEqual(1);
    });

    it('returns correct TypeDef for composite def', () => {
      const def: ContractTypeDef = { composite: { fields: [{ name: 'test', type: 1, typeName: 'Test' }] } };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'Struct' };

      expect(result.type).toBe('Struct');
      expect(result.value.fields[0].name).toEqual('test');
      expect(result.value.fields[0].typeId).toEqual(1);
      expect(result.value.fields[0].typeName).toEqual('Test');
    });

    it('returns correct TypeDef for primitive def', () => {
      const def: ContractTypeDef = { primitive: 'u8' };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'Primitive' };

      expect(result.type).toBe('Primitive');
      expect(result.value.kind).toEqual('u8');
    });

    it('returns correct TypeDef for array def', () => {
      const def: ContractTypeDef = { array: { len: 5, type: 1 } };
      const result = normalizeContractTypeDef(def) as TypeDef & { type: 'SizedVec' };

      expect(result.type).toBe('SizedVec');
      expect(result.value.len).toBe(5);
    });

    it('throws error for invalid def', () => {
      const def = { invalid: {} };
      expect(() => normalizeContractTypeDef(def as ContractTypeDef)).toThrow();
    });
  });
  describe('extractContractTypes', () => {
    it('returns correct PortableType array for valid ContractMetadata', () => {
      const flipper = FLIPPER_CONTRACT_METADATA_V4;

      const result = extractContractTypes(FLIPPER_CONTRACT_METADATA_V4);
      expect(result).toHaveLength(flipper.types.length);
      expect(result[0]).toHaveProperty('id', flipper.types[0].id);
      expect(result[0]).toHaveProperty('typeDef');
      expect(result[0]).toHaveProperty('params');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('docs');
    });
  });

  describe('normalizeLabel', () => {
    it('returns empty string for undefined input', () => {
      expect(normalizeLabel()).toBe('');
    });

    it('returns camelCase string for input with double colons', () => {
      expect(normalizeLabel('Test::Label')).toBe('testLabel');
      expect(normalizeLabel('PSP22::balance_of')).toBe('psp22BalanceOf');
      expect(normalizeLabel('PSP22::transfer_from')).toBe('psp22TransferFrom');
      expect(normalizeLabel('CodeHash::code_hash')).toBe('codeHashCodeHash');
      expect(normalizeLabel('Ownable::owner')).toBe('ownableOwner');
    });

    it('returns camelCase string for input with underscores', () => {
      expect(normalizeLabel('Test_Label')).toBe('testLabel');
    });

    it('returns camelCase string for input with spaces', () => {
      expect(normalizeLabel('Test Label')).toBe('testLabel');
    });

    it('returns camelCase string for input with mixed characters', () => {
      expect(normalizeLabel('Test_Label::Another Label')).toBe('testLabelAnotherLabel');
    });
  });

  describe('toReturnFlags', () => {
    it('should works properly', () => {
      expect(toReturnFlags(0)).toEqual({ bits: 0, revert: false } as ReturnFlags);
      expect(toReturnFlags(1)).toEqual({ bits: 1, revert: true } as ReturnFlags);
      expect(toReturnFlags(2)).toEqual({ bits: 2, revert: false } as ReturnFlags);
    });
  });
});
