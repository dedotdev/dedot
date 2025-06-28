import { PalletErrorMetadataLatest } from '@dedot/codecs';
import { describe, expect, it } from 'vitest';
import { ContractDispatchError, ContractInstantiateDispatchError } from '../errors';

describe('Dispatch Errors', () => {
  const mockDispatchError = { type: 'Module', value: { index: 1, error: '0x00' } } as any;
  const mockRawResult = {} as any;
  const mockModuleError: PalletErrorMetadataLatest = {
    pallet: 'TestPallet',
    name: 'TestError',
    docs: ['This is a test error.'],
    fields: [],
    index: 0,
    fieldCodecs: [],
    palletIndex: 0,
  };

  describe('ContractInstantiateDispatchError', () => {
    it('should format the message with module error details when provided', () => {
      const error = new ContractInstantiateDispatchError(mockDispatchError, mockRawResult, mockModuleError);
      expect(error.message).toBe('Dispatch error: TestPallet::TestError - This is a test error.');
      expect(error.moduleError).toBe(mockModuleError);
    });

    it('should use JSON.stringify for the message when module error is not provided', () => {
      const error = new ContractInstantiateDispatchError(mockDispatchError, mockRawResult);
      expect(error.message).toBe(`Dispatch error: ${JSON.stringify(mockDispatchError)}`);
      expect(error.moduleError).toBeUndefined();
    });
  });

  describe('ContractDispatchError', () => {
    it('should format the message with module error details when provided', () => {
      const error = new ContractDispatchError(mockDispatchError, mockRawResult, mockModuleError);
      expect(error.message).toBe('Dispatch error: TestPallet::TestError - This is a test error.');
      expect(error.moduleError).toBe(mockModuleError);
    });

    it('should use JSON.stringify for the message when module error is not provided', () => {
      const error = new ContractDispatchError(mockDispatchError, mockRawResult);
      expect(error.message).toBe(`Dispatch error: ${JSON.stringify(mockDispatchError)}`);
      expect(error.moduleError).toBeUndefined();
    });
  });
});
