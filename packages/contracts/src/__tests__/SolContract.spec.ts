import { LegacyClient } from '@dedot/api';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { stringCamelCase } from '@dedot/utils';
import { describe, it, expect, beforeEach } from 'vitest';
import { SolContract } from '../SolContract.js';
import { MockedRuntimeVersion } from './Contract.spec.js';
import { RANDOM_CONTRACT_ADDRESS } from './contracts-metadata.js';
import { flipperSol } from './flipper_sol.js';

describe('SolContract', () => {
  let api: LegacyClient, provider: MockProvider;

  describe('api support pallet-revive', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
    });

    it('expect to find functions meta for query and tx', () => {
      const [, abi] = flipperSol();
      const abiItems = JSON.parse(abi) as Array<any>;
      const evmAddr = '0x' + '11'.repeat(20);
      const contract = new SolContract(api, abi, evmAddr);

      const functions = abiItems.filter((i) => i.type === 'function');
      const view = functions.find((f) => f.stateMutability === 'view');
      const tx = functions.find((f) => f.stateMutability !== 'view');

      expect(view).toBeDefined();
      expect(tx).toBeDefined();

      const viewName = stringCamelCase(view!.name);
      const txName = stringCamelCase(tx!.name);

      // meta should be attached by executors
      expect((contract.query as any)[viewName].meta).toBeDefined();
      expect((contract.tx as any)[txName].meta).toBeDefined();
    });

    it('expect to throw error if contract address invalid (non-EVM)', () => {
      const [, abi] = flipperSol();
      // Using a Substrate address should fail for SolContract (EVM expected)
      expect(() => new SolContract(api, abi, RANDOM_CONTRACT_ADDRESS)).toThrowError(
        new Error(
          `Invalid contract address: ${RANDOM_CONTRACT_ADDRESS}. Expected an EVM 20-byte address as a hex string or a Uint8Array`,
        ),
      );
    });

    it('expect to throw error if eventRecord is not ContractEmitted palletEvent', () => {
      const [, abi] = flipperSol();
      const evmAddr = '0x' + '44'.repeat(20);
      const contract = new SolContract(api, abi, evmAddr);

      const notContractEmittedEventRecordHex =
        '0x00010000000600d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d8b15a74b0000000000000000000000000000000000000000000000000000000000';

      const eventRecord = api.registry.findCodec(20).tryDecode(notContractEmittedEventRecordHex) as any;
      expect(() => contract.registry.decodeEvent(eventRecord, evmAddr)).toThrowError('Invalid ContractEmitted Event');
    });
  });

  describe('api not support pallet-revive', () => {
    it('expect to throw error if pallet-revive unsupported', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      const [, abi] = flipperSol();
      const evmAddr = '0x' + '33'.repeat(20);
      expect(() => new SolContract(api, abi, evmAddr)).toThrowError('Pallet Revive is not available');
    });
  });
});
