import { LegacyClient, FallbackRuntimeApis } from '@dedot/api';
import { FrameSystemEventRecord } from '@dedot/api/chaintypes/index.js';
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { RuntimeVersion } from '@dedot/codecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Contract } from '../Contract.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC,
  FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC_INDEXED_FIELDS,
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
      it('should decode if can detect anonymous event meta', () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC, RANDOM_CONTRACT_ADDRESS);

        const contractEmittedEventRecord =
          '0x000100000008037e00d4cc806c1d91d5caccb5f933511d3270761ec5fb68bc6ab01ebe727fe6db08010000';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        expect(flipper.events.Flipped.is(decodedEvent!)).toEqual(true);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: true, new: false } });
      });

      it('should decode if can detect anoymous event meta has indexed fields', () => {
        flipper = new Contract(
          api,
          FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC_INDEXED_FIELDS,
          RANDOM_CONTRACT_ADDRESS,
        );

        const contractEmittedEventRecord =
          '0x000100000008035b5507db890cba8d6ecc300104b80f4506d9d973276f6c8ff5b370347ce011af0800010800000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        expect(flipper.events.Flipped.is(decodedEvent!)).toEqual(true);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });

      it('should decode properly', () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);

        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        expect(flipper.events.Flipped.is(decodedEvent!)).toEqual(true);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });

      it('should throw error if cannot determine the event meta', () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC, RANDOM_CONTRACT_ADDRESS);

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
          '0x00010000000803c9ea3bd36943af3e70dfbdefe0a7ac6af85f912260c15074917071183e9732570c0000010400466c69707065723a3a466c6970706564000000000000000000000000000000';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        expect(flipper.events.Flipped.is(decodedEvent!)).toEqual(true);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });
    });
  });
});
