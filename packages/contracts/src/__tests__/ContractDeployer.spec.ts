import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { Dedot } from 'dedot';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContractDeployer } from '../ContractDeployer';
import { FLIPPER, MockedRuntimeVersionWithContractsApi } from './Contract.spec';

describe('ContractDeployer', () => {
  let api: Dedot, provider: MockProvider, contractDeployer: ContractDeployer<any>;

  describe('api support contracts pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersionWithContractsApi);
      api = await Dedot.new({ provider });
      contractDeployer = new ContractDeployer(api, FLIPPER, FLIPPER.source.hash);
    });

    it('should found constructor messages meta', () => {
      expect(contractDeployer.tx.new.meta).toBeDefined();
      expect(contractDeployer.query.new.meta).toBeDefined();
    });

    it('should throw if constructor meta not found', () => {
      expect(() => contractDeployer.tx.notFound()).toThrowError('Constructor not found: notFound');
      expect(() => contractDeployer.query.notFound()).toThrowError('Constructor not found: notFound');
    });
  });

  describe('api not support contracts pallet', () => {
    it('should throw error', async () => {
      provider = new MockProvider();
      api = await Dedot.new({ provider });
      expect(() => new ContractDeployer(api, FLIPPER, FLIPPER.source.hash)).toThrowError(
        'This api does not support contracts pallet',
      );
    });
  });
});
