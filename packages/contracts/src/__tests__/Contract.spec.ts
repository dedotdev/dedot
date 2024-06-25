import { LegacyClient, FallbackRuntimeApis } from '@dedot/api';
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { RuntimeVersion } from '@dedot/codecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Contract } from '../Contract.js';
import { FLIPPER_CONTRACT_METADATA, PSP22_CONTRACT_METADATA, RANDOM_CONTRACT_ADDRESS } from './contracts-metadata.js';

export const MockedRuntimeVersionWithContractsApi: RuntimeVersion = {
  specName: 'mock-spec',
  implName: 'mock-spec-impl',
  authoringVersion: 0,
  specVersion: 1,
  implVersion: 0,
  apis: [
    // @ts-ignore
    ...Object.entries(FallbackRuntimeApis),
    // @ts-ignore
    ['0x68b66ba122c93fa7', 2], // ContractsApi v2
  ],
  transactionVersion: 25,
  stateVersion: 0,
};

describe('Contract', () => {
  let api: LegacyClient, provider: MockProvider, flipper: Contract, psp22: Contract;

  describe('api support contracts pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersionWithContractsApi);
      api = await LegacyClient.new({ provider });
      flipper = new Contract(api, FLIPPER_CONTRACT_METADATA, RANDOM_CONTRACT_ADDRESS);
      psp22 = new Contract(api, PSP22_CONTRACT_METADATA, RANDOM_CONTRACT_ADDRESS);
    });

    it('should found contracts messages meta', () => {
      expect(flipper.tx.flip.meta).toBeDefined();
      expect(flipper.query.get.meta).toBeDefined();

      expect(psp22.query.psp22BalanceOf.meta).toBeDefined();
      expect(psp22.query.psp22TransferFrom.meta).toBeDefined();
      expect(psp22.query.psp22Transfer.meta).toBeDefined();
      expect(psp22.query.psp22Approve.meta).toBeDefined();
      expect(psp22.query.psp22TotalSupply.meta).toBeDefined();
      expect(psp22.query.psp22IncreaseAllowance.meta).toBeDefined();
      expect(psp22.query.psp22DecreaseAllowance.meta).toBeDefined();
      expect(psp22.query.psp22Allowance.meta).toBeDefined();
      expect(psp22.query.psp22MetadataTokenDecimals.meta).toBeDefined();
      expect(psp22.query.psp22MetadataTokenName.meta).toBeDefined();
      expect(psp22.query.psp22MetadataTokenSymbol.meta).toBeDefined();

      expect(psp22.tx.psp22TransferFrom.meta).toBeDefined();
      expect(psp22.tx.psp22Transfer.meta).toBeDefined();
      expect(psp22.tx.psp22Approve.meta).toBeDefined();
      expect(psp22.tx.psp22IncreaseAllowance.meta).toBeDefined();
      expect(psp22.tx.psp22DecreaseAllowance.meta).toBeDefined();
      expect(() => psp22.tx.psp22BalanceOf).toThrowError(`Tx message not found: psp22BalanceOf`);
      expect(() => psp22.tx.psp22TotalSupply).toThrowError(`Tx message not found: psp22TotalSupply`);
      expect(() => psp22.tx.psp22Allowance).toThrowError(`Tx message not found: psp22Allowance`);
      expect(() => psp22.tx.psp22MetadataTokenDecimals).toThrowError(
        `Tx message not found: psp22MetadataTokenDecimals`,
      );
      expect(() => psp22.tx.psp22MetadataTokenName).toThrowError(`Tx message not found: psp22MetadataTokenName`);
      expect(() => psp22.tx.psp22MetadataTokenSymbol).toThrowError(`Tx message not found: psp22MetadataTokenSymbol`);
    });

    it('should throw error if message meta not found', () => {
      expect(() => flipper.tx.notFound).toThrowError('Tx message not found: notFound');
      expect(() => flipper.query.notFound).toThrowError('Query message not found: notFound');
    });
  });

  describe('api not support contracts pallet', () => {
    it('should throw error', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA, RANDOM_CONTRACT_ADDRESS)).toThrowError(
        'Contracts pallet is not available',
      );
    });
  });
});
