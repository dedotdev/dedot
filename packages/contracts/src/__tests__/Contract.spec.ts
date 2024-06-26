import { LegacyClient, FallbackRuntimeApis } from '@dedot/api';
import { FrameSystemEventRecord } from '@dedot/api/chaintypes/index.js';
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { RuntimeVersion } from '@dedot/codecs';
import { ContractMetadataV5 } from 'src/types/v5.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { Contract } from '../Contract.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  PSP22_CONTRACT_METADATA,
  RANDOM_CONTRACT_ADDRESS,
} from './contracts-metadata.js';
import substrateContractMetadata from './substrateContractMetadata.js';

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
      flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V4, RANDOM_CONTRACT_ADDRESS);
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
      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA_V4, RANDOM_CONTRACT_ADDRESS)).toThrowError(
        'Contracts pallet is not available',
      );
    });
  });

  describe('decodeEvent', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersionWithContractsApi, substrateContractMetadata);
      api = await LegacyClient.new({ provider });
      flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);
    });

    it('should throw error if eventRecord is not ContractEmitted palletEvent', () => {
      const notContractEmittedEventRecordHex =
        '0x00010000000408d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d7bd1726000000000000000000000000000';
      const eventRecord = api.registry
        .findCodec(19)
        .tryDecode(notContractEmittedEventRecordHex) as FrameSystemEventRecord;

      expect(() => flipper.decodeEvent(eventRecord)).toThrowError(`Event Record is not valid!`);
    });

    describe('decodeEventV5', () => {
      beforeEach(async () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);
      });

      it('should decode properly', () => {
        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });

      it('should throw error if cannot determine the event meta', () => {
        const mockFlipper = structuredClone(FLIPPER_CONTRACT_METADATA_V5) as ContractMetadataV5;
        mockFlipper.spec.events.at(0)!.signature_topic = null;
        mockFlipper.spec.events.push(mockFlipper.spec.events.at(0)!);

        flipper = new Contract(api, mockFlipper, RANDOM_CONTRACT_ADDRESS);

        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        expect(() => flipper.decodeEvent(eventRecord)).toThrowError('Unable to determine event!');
      });
    });

    describe('decodeEventV4', () => {
      beforeEach(async () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V4, RANDOM_CONTRACT_ADDRESS);
      });

      it('should decode properly', () => {
        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: true, new: false } });
      });
    });
  });
});
