import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { generateRandomHex } from '@dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContractDeployer } from '../ContractDeployer.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  FLIPPER_CONTRACT_METADATA_V6,
  PSP22_CONTRACT_METADATA,
} from './contracts-metadata.js';

describe('ContractDeployer', () => {
  let api: LegacyClient, provider: MockProvider, flipper: ContractDeployer, psp22: ContractDeployer;

  describe('api support pallet', () => {
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

    it('should throw error if invalid code hash or code', () => {
      expect(() => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, '0xffff')).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      const invalidCodeHash = generateRandomHex(128);
      expect(() => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, invalidCodeHash)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      expect(
        () =>
          new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V6.source.contract_binary!),
      ).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V6, FLIPPER_CONTRACT_METADATA_V5.source.wasm!),
      ).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );
    });
  });

  describe('api not support pallet', () => {
    it('should throw error if api not support pallet-contracts', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_CONTRACT_METADATA_V4.source.hash),
      ).toThrowError('Pallet Contracts is not available');
    });

    it('should throw error if api not support pallet-revive', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(
        () => new ContractDeployer(api, FLIPPER_CONTRACT_METADATA_V6, FLIPPER_CONTRACT_METADATA_V6.source.hash),
      ).toThrowError('Pallet Revive is not available');
    });
  });
});
