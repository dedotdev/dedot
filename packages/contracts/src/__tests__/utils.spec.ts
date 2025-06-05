import { TypeDef } from '@dedot/codecs';
import { describe, expect, it } from 'vitest';
import { ContractMetadata, ContractTypeDef, ReturnFlags } from '../types/index.js';
import {
  CREATE1,
  CREATE2,
  extractContractTypes,
  normalizeContractTypeDef,
  normalizeLabel,
  toEthAddress,
  toReturnFlags,
} from '../utils/index.js';
import { FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V6 } from './contracts-metadata.js';

describe('utils', () => {
  describe('types', () => {
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

        const result = extractContractTypes(FLIPPER_CONTRACT_METADATA_V4 as ContractMetadata);
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

  describe('address', () => {
    describe('create1', () => {
      it('should generate correct address for deployer and nonce', () => {
        const deployer = '0x9621dde636de098b43efb0fa9b61facfe328f99d';
        const nonce = 39;

        const result = CREATE1(deployer, nonce);

        expect(result).toBe('0x2e66c81231a5a1be75aea054b010e5c2f40ea90f');
      });
    });

    describe('create2', () => {
      it('should generate correct address for given parameters', () => {
        const deployer = '0x9621dde636de098b43efb0fa9b61facfe328f99d';
        const code = FLIPPER_CONTRACT_METADATA_V6.source.contract_binary!;
        const inputData = '0x9bae9d5e01';
        const salt = '0x00db90387370ad89cb16adfbc6c33e7de7e960a318af0c3ad95a471f500a3e7b';

        const result = CREATE2(deployer, code, inputData, salt);

        expect(result).toBe('0x96e3ef2ec5c06ec612863cb18c0dff3741f95d02');
      });
    });

    describe('toEthAddress', () => {
      it('should convert ss58 to eth address', () => {
        const accountId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

        const result = toEthAddress(accountId);

        expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(result).toBe('0x9621dde636de098b43efb0fa9b61facfe328f99d');
      });

      it('should handle eth-derived addresses correctly', () => {
        // Create an eth-derived substrate account (with 0xee suffix at positions 20-31)
        const ethAddress = '0x1234567890123456789012345678901234567890';
        const ethDerivedAccount = ethAddress + 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

        const result = toEthAddress(ethDerivedAccount);

        expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(result).toBe(ethAddress);
      });
    });
  });
});
