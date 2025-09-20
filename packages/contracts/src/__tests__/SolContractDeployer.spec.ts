import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { generateRandomHex } from '@dedot/utils';
import { describe, it, expect, beforeEach } from 'vitest';
import { SolContractDeployer } from '../SolContractDeployer.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import { FLIPPER_CONTRACT_METADATA_V5 } from './contracts-metadata.js';
import { flipperSol } from './flipper_sol.js';

describe('SolContractDeployer', () => {
  let api: LegacyClient, provider: MockProvider;

  describe('api support pallet-revive', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
    });

    it('expect to find constructor meta in tx and query', () => {
      const [code, abi] = flipperSol();
      const deployer = new SolContractDeployer(api, abi, code);

      expect((deployer.tx as any).new.meta).toBeDefined();
      expect((deployer.query as any).new.meta).toBeDefined();
    });

    it('expect to throw error if invalid code hash or code', () => {
      const [, abi] = flipperSol();

      // invalid short hex string
      expect(() => new SolContractDeployer(api, abi, '0xffff')).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      // invalid random long hex (not 32-byte) -> length 64 hex chars (32 bytes) is valid, test non-32 size
      const invalidCodeHash = generateRandomHex(128 + 2); // 65 bytes
      expect(() => new SolContractDeployer(api, abi, invalidCodeHash)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );

      // passing WASM code for revive (expects PVM) should be invalid
      expect(() => new SolContractDeployer(api, abi, FLIPPER_CONTRACT_METADATA_V5.source.wasm!)).toThrowError(
        new Error(
          'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
        ),
      );
    });
  });

  describe('api not support pallet-revive', () => {
    it('expect to throw error if pallet-revive unsupported', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      const [code, abi] = flipperSol();
      expect(() => new SolContractDeployer(api, abi, code)).toThrowError('Pallet Revive is not available');
    });
  });
});
