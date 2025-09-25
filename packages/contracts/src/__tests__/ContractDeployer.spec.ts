import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { generateRandomHex } from '@dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContractDeployer } from '../ContractDeployer.js';
import { SolRegistry } from '../SolRegistry.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  FLIPPER_CONTRACT_METADATA_V6,
  FLIPPER_SOL_ABI,
  FLIPPER_SOL_CONTRACT_CODE,
  PSP22_CONTRACT_METADATA,
} from './contracts-metadata.js';

describe('ContractDeployer', () => {
  let api: LegacyClient,
    provider: MockProvider,
    flipper: ContractDeployer,
    psp22: ContractDeployer,
    solFlipper: ContractDeployer;

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

  describe('sol contract deployer support', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      solFlipper = new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE);
    });

    it('should create sol contract deployer instance', () => {
      expect(solFlipper).toBeDefined();
      expect(solFlipper.metadata).toBe(FLIPPER_SOL_ABI);
      expect(solFlipper.tx).toBeDefined();
      expect(solFlipper.query).toBeDefined();
      expect(solFlipper.registry).toBeInstanceOf(SolRegistry);
    });

    it('should have sol constructor methods available', () => {
      expect(solFlipper.tx).toBeDefined();
      expect(solFlipper.query).toBeDefined();
    });

    it('should handle sol constructor calls properly', async () => {
      // Sol contracts use a single constructor method, not named constructors
      // The constructor should require proper parameters based on ABI
      // FLIPPER_SOL_ABI constructor requires init_value: bool
      expect(() => solFlipper.tx.constructor()).toThrow('Expected at least 1 arguments, got 0');

      // For async query, we need to handle it differently
      await expect(async () => {
        await solFlipper.query.constructor();
      }).rejects.toThrow('Expected at least 1 arguments, got 0');
    });

    it('should throw error if invalid code hash or code for sol contracts', () => {
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, '0xffff')).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      const invalidCodeHash = generateRandomHex(128);
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, invalidCodeHash)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      // Test with ink contract WASM code for sol contract (should fail)
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_CONTRACT_METADATA_V5.source.wasm!)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );
    });

    it('should accept valid 32-byte hash for sol contracts', () => {
      const validHash = generateRandomHex(32); // 32 bytes, generateRandomHex already includes 0x prefix
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, validHash)).not.toThrow();
    });

    it('should accept valid PVM code for sol contracts', () => {
      // The FLIPPER_SOL_CONTRACT_CODE should be valid PVM bytecode
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE)).not.toThrow();
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

    it('should throw error if api not support pallet-revive for sol contracts', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(() => new ContractDeployer(api, FLIPPER_SOL_ABI, FLIPPER_SOL_CONTRACT_CODE)).toThrowError(
        'Pallet Revive is not available',
      );
    });
  });
});
