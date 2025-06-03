import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContractDeployer } from '../ContractDeployer.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import { FLIPPER_CONTRACT_METADATA_V4, PSP22_CONTRACT_METADATA } from './contracts-metadata.js';

describe('ContractDeployer', () => {
  let api: LegacyClient, provider: MockProvider, flipper: ContractDeployer, psp22: ContractDeployer;

  describe('api support contracts pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      flipper = new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V4.source.hash);
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
      api = await LegacyClient.new({ provider });
      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V4.source.hash),
      ).toThrowError('Pallet Contracts is not available');
    });
  });
});
