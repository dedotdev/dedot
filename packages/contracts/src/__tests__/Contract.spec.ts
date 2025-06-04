import { FallbackRuntimeApis, LegacyClient } from '@dedot/api';
import { FrameSystemEventRecord } from '@dedot/api/chaintypes/index.js';
// @ts-ignore
import MockProvider from '@dedot/api/client/__tests__/MockProvider';
import { RuntimeVersion } from '@dedot/codecs';
import { ContractEvent } from '@dedot/contracts';
import { IEventRecord } from '@dedot/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { Contract } from '../Contract.js';
import {
  FLIPPER_CONTRACT_METADATA_V4,
  FLIPPER_CONTRACT_METADATA_V5,
  FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC,
  FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC_INDEXED_FIELDS,
  FLIPPER_CONTRACT_METADATA_V6,
  PSP22_CONTRACT_METADATA,
  RANDOM_CONTRACT_ADDRESS,
} from './contracts-metadata.js';
import reviveMetadata from './reviveMetadata.js';
import substrateContractMetadata from './substrateContractMetadata.js';

export const MockedRuntimeVersion: RuntimeVersion = {
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
    // @ts-ignore
    ['0x8c403e5c4a9fd442', 1], // ReviveApi v1
  ],
  transactionVersion: 25,
  stateVersion: 0,
};

const FLIPPER_V4_CONTRACT_ADDRESS = '5GdT4fJfXHtLxEk3npnK9a65LF986z67uRKhZ9TsZ17Lnhdg';
const FLIPPER_V6_CONTRACT_ADDRESS = '0xbd94eb5fdc31ef0e54dca45284fe779165ecaaed';

describe('Contract', () => {
  let api: LegacyClient, provider: MockProvider, flipper: Contract, psp22: Contract;

  describe('api support pallet', () => {
    beforeEach(async () => {
      provider = new MockProvider(MockedRuntimeVersion);
      api = await LegacyClient.new({ provider });
      flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_V4_CONTRACT_ADDRESS);
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

    it('should throw error if contract address invalid', () => {
      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA_V6, FLIPPER_V4_CONTRACT_ADDRESS)).toThrowError(
        new Error(
          `Invalid pallet-revive contract address: ${FLIPPER_V4_CONTRACT_ADDRESS}. It should be a 20-byte address (0x + 40 hex characters)`,
        ),
      );

      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA_V5, FLIPPER_V6_CONTRACT_ADDRESS)).toThrowError(
        new Error(
          `Invalid pallet-contracts contract address: ${FLIPPER_V6_CONTRACT_ADDRESS}. It should be a 32-byte address (0x + 64 hex characters)`,
        ),
      );

      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_V6_CONTRACT_ADDRESS)).toThrowError(
        new Error(
          `Invalid pallet-contracts contract address: ${FLIPPER_V6_CONTRACT_ADDRESS}. It should be a 32-byte address (0x + 64 hex characters)`,
        ),
      );
    });
  });

  describe('api not support pallet', () => {
    it('should throw error if api not support pallet-contracts', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA_V4, RANDOM_CONTRACT_ADDRESS)).toThrowError(
        'Pallet Contracts is not available',
      );
    });

    it('should throw error if api not support pallet-revive', async () => {
      provider = new MockProvider();
      api = await LegacyClient.new({ provider });
      expect(() => new Contract(api, FLIPPER_CONTRACT_METADATA_V6, RANDOM_CONTRACT_ADDRESS)).toThrowError(
        'Pallet Revive is not available',
      );
    });
  });

  describe('decodeEvent', () => {
    const verifyFlipperEvent = (event: ContractEvent) => {
      expect(flipper.events.Flipped.is(event)).toEqual(true);
      expect(flipper.events.Flipped.filter([event])).toEqual([event]);
      expect(flipper.events.Flipped.find([event])).toEqual(event);
    };

    const verifyFlipperEventRecord = (record: IEventRecord, decodedEvent: ContractEvent) => {
      expect(flipper.events.Flipped.is(record)).toEqual(true);
      expect(flipper.events.Flipped.filter([record])).toEqual([decodedEvent]);
      expect(flipper.events.Flipped.find([record])).toEqual(decodedEvent);
    };

    describe('decodeEventV4', () => {
      beforeEach(async () => {
        provider = new MockProvider(MockedRuntimeVersion, substrateContractMetadata);
        api = await LegacyClient.new({ provider });
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V4, FLIPPER_V4_CONTRACT_ADDRESS);
      });

      it('should throw error if eventRecord is not ContractEmitted palletEvent', () => {
        const notContractEmittedEventRecordHex =
          '0x00010000000408d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d7bd1726000000000000000000000000000';

        const eventRecord = api.registry
          .findCodec(19)
          .tryDecode(notContractEmittedEventRecordHex) as FrameSystemEventRecord;

        expect(() => flipper.decodeEvent(eventRecord)).toThrowError('Invalid ContractEmitted Event');
      });

      it('should decode properly', () => {
        const contractEmittedEventRecord =
          '0x00010000000803c9ea3bd36943af3e70dfbdefe0a7ac6af85f912260c15074917071183e9732570c0000010400466c69707065723a3a466c6970706564000000000000000000000000000000';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        verifyFlipperEvent(decodedEvent);
        verifyFlipperEventRecord(eventRecord, decodedEvent);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });
    });

    describe('decodeEventV5', () => {
      beforeEach(async () => {
        provider = new MockProvider(MockedRuntimeVersion, substrateContractMetadata);
        api = await LegacyClient.new({ provider });
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);
      });
      it('should decode if can detect anonymous event meta', () => {
        flipper = new Contract(
          api,
          FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC,
          '5Euv8w2AmFMVNePZEkG9T7zVsgY2TNyt2V9NoBcmiS1zTrz6',
        );

        const contractEmittedEventRecord =
          '0x000100000008037e00d4cc806c1d91d5caccb5f933511d3270761ec5fb68bc6ab01ebe727fe6db08010000';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        verifyFlipperEvent(decodedEvent);
        verifyFlipperEventRecord(eventRecord, decodedEvent);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: true, new: false } });
      });

      it('should decode if can detect anoymous event meta has indexed fields', () => {
        flipper = new Contract(
          api,
          FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC_INDEXED_FIELDS,
          '5E8TUSzaDG3AHRNHBqhtb4egLUrULR4ojLPXo2Rm3a1RNJ1c',
        );

        const contractEmittedEventRecord =
          '0x000100000008035b5507db890cba8d6ecc300104b80f4506d9d973276f6c8ff5b370347ce011af0800010800000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        verifyFlipperEvent(decodedEvent);
        verifyFlipperEventRecord(eventRecord, decodedEvent);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });

      it('should decode properly', () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, '5HYcsFkV9ath7f8t8bAUqmfuh6iTrVzsXxjNhN3EvEPsKmF9');

        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        const decodedEvent = flipper.decodeEvent(eventRecord);

        verifyFlipperEvent(decodedEvent);
        verifyFlipperEventRecord(eventRecord, decodedEvent);
        expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
      });

      it('should throw error if contract address does not match', () => {
        flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V5, RANDOM_CONTRACT_ADDRESS);

        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        expect(() => flipper.decodeEvent(eventRecord)).toThrowError('Invalid ContractEmitted Event');
      });

      it('should throw error if cannot determine the event meta', () => {
        flipper = new Contract(
          api,
          FLIPPER_CONTRACT_METADATA_V5_NO_SIGNATURE_TOPIC,
          '5HYcsFkV9ath7f8t8bAUqmfuh6iTrVzsXxjNhN3EvEPsKmF9',
        );

        const contractEmittedEventRecord =
          '0x00010000000803f2773dba008bbe3bb76fa8cb89fddb534b4e81dcaf52faaf94190a89ab3d3b04080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';
        const eventRecord = api.registry.findCodec(19).tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

        expect(() => flipper.decodeEvent(eventRecord)).toThrowError('Unable to determine event!');
      });

      describe('decodeEventV6', () => {
        beforeEach(async () => {
          provider = new MockProvider(MockedRuntimeVersion, reviveMetadata);
          api = await LegacyClient.new({ provider });
          flipper = new Contract(api, FLIPPER_CONTRACT_METADATA_V6, FLIPPER_V6_CONTRACT_ADDRESS);
        });
        it('should throw if contract address does not match', () => {
          const notContractEmittedEventRecordHex =
            '0x000100000008004f47fdbeea4563033cf473d44e0672cc0990b3a0080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e88600';

          const eventRecord = api.registry
            .findCodec(20)
            .tryDecode(notContractEmittedEventRecordHex) as FrameSystemEventRecord;

          expect(() => flipper.decodeEvent(eventRecord)).toThrowError('Invalid ContractEmitted Event');
        });

        it('should throw error if eventRecord is not ContractEmitted palletEvent', () => {
          const notContractEmittedEventRecordHex =
            '0x00010000000600d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d8b15a74b0000000000000000000000000000000000000000000000000000000000';

          const eventRecord = api.registry
            .findCodec(20)
            .tryDecode(notContractEmittedEventRecordHex) as FrameSystemEventRecord;

          expect(() => flipper.decodeEvent(eventRecord)).toThrowError('Invalid ContractEmitted Event');
        });

        it('should decode properly', async () => {
          const contractEmittedEventRecord =
            '0x00010000000800bd94eb5fdc31ef0e54dca45284fe779165ecaaed080001040a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e88600';
          const eventRecord = api.registry
            .findCodec(20)
            .tryDecode(contractEmittedEventRecord) as FrameSystemEventRecord;

          const decodedEvent = flipper.decodeEvent(eventRecord);

          verifyFlipperEvent(decodedEvent);
          verifyFlipperEventRecord(eventRecord, decodedEvent);
          expect(decodedEvent).toEqual({ name: 'Flipped', data: { old: false, new: true } });
        });
      });
    });
  });
});
