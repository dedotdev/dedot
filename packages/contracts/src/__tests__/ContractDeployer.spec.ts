import { Dedot } from '@dedot/api';
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContractDeployer } from '../ContractDeployer';
import { MockedRuntimeVersionWithContractsApi } from './Contract.spec';
import { FLIPPER_CONTRACT_METADATA, PSP22_CONTRACT_METADATA } from './contracts-metadata';

describe('ContractDeployer', () => {
  let api: Dedot, provider: MockProvider, flipper: ContractDeployer, psp22: ContractDeployer;

  describe('api support contracts pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersionWithContractsApi);
      api = await Dedot.new({ provider });
      flipper = new ContractDeployer(api, FLIPPER_CONTRACT_METADATA, FLIPPER_CONTRACT_METADATA.source.hash);
      psp22 = new ContractDeployer(api, PSP22_CONTRACT_METADATA, PSP22_CONTRACT_METADATA.source.hash);
    });

    it('should found constructor messages meta', () => {
      expect(flipper.tx.new.meta).toBeDefined();
      expect(flipper.query.new.meta).toBeDefined();
      expect(psp22.tx.new.meta).toBeDefined();
      expect(psp22.query.new.meta).toBeDefined();
    });

    it('should throw if constructor meta not found', () => {
      expect(() => flipper.tx.notFound()).toThrowError('Constructor message not found: notFound');
      expect(() => flipper.query.notFound()).toThrowError('Constructor message not found: notFound');
    });
  });

  describe('api not support contracts pallet', () => {
    it('should throw error', async () => {
      provider = new MockProvider();
      api = await Dedot.new({ provider });
      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA, FLIPPER_CONTRACT_METADATA.source.hash),
      ).toThrowError('Contracts pallet is not available');
    });
  });
});
