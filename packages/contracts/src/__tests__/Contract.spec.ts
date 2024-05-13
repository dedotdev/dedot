import {Dedot, FallbackRuntimeApis, RuntimeVersion} from 'dedot';
import MockProvider from 'dedot/client/__tests__/MockProvider';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import { Contract } from '../Contract';
// @ts-ignore
import flipperRaw from './flipper.json' assert { type: "json" };
import {parseRawMetadata} from "../utils";

export const FLIPPER = parseRawMetadata(JSON.stringify(flipperRaw));
export const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
export const MOCK_ADDRESS = '5GpTe4rrVUcZbndCc6HGNCLNfs84R9xaQ9FhPYXQFUZqMVZn'

export const MockedRuntimeVersionWithContractsApi: RuntimeVersion = {
  specName: 'mock-spec',
  implName: 'mock-spec-impl',
  authoringVersion: 0,
  specVersion: 1,
  implVersion: 0,
  // @ts-ignore
  apis: [...Object.entries(FallbackRuntimeApis), ['0x68b66ba122c93fa7', 2]],
  transactionVersion: 25,
  stateVersion: 0,
};

describe('Contract', () => {
  let api: Dedot, provider: MockProvider, contract: Contract<any>;

  describe('api support contracts pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersionWithContractsApi);
      api = await Dedot.new({ provider });
      contract = new Contract(api, MOCK_ADDRESS, FLIPPER);
    })

    it('should found contracts messages meta', () => {
      expect(contract.tx.flip.meta).toBeDefined();
      expect(contract.query.get.meta).toBeDefined();
    });

    it('should throw error if message meta not found', () => {
        expect(() => contract.tx.notFound).toThrowError('Tx message not found: notFound');
        expect(() => contract.query.notFound).toThrowError('Query message not found: notFound');
      });
    })

  describe('api not support contracts pallet', () => {
    it('should throw error', async () => {
      provider = new MockProvider();
      api = await Dedot.new({ provider });
      expect(() => new Contract(api, MOCK_ADDRESS, FLIPPER)).toThrowError('This api does not support contracts pallet');
    });
  })
});
