import { AccountId32, Bytes, H160, H256, TypeId, TypeRegistry } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { IEventRecord, IRuntimeEvent } from '@dedot/types';
import { assert, DedotError, HexString, hexToU8a, stringCamelCase, stringPascalCase } from '@dedot/utils';
import { LazyMapping, LazyObject, LazyStorageVec } from './storage/index.js';
import { ContractAddress, ContractEvent, ContractEventMeta, ContractMetadata, ContractType } from './types/index.js';
import { extractContractTypes, isLazyType, KnownLazyType } from './utils/index.js';

type KnownPallets = 'Contracts' | 'Revive';

interface ContractEmittedEvent<Pallet extends KnownPallets = 'Contracts'> extends IRuntimeEvent {
  pallet: Pallet;
  palletEvent: {
    name: 'ContractEmitted';
    data: Pallet extends 'Contracts'
      ? {
          contract: AccountId32;
          data: Bytes;
        }
      : {
          contract: H160;
          data: Bytes;
          topics: Array<H256>;
        };
  };
}

export interface TypinkRegistryOptions {
  /**
   * Get raw contract storage value given a key
   *
   * @param key
   */
  getStorage?: (key: Uint8Array | HexString) => Promise<HexString | undefined>;
}

export class TypinkRegistry extends TypeRegistry {
  constructor(
    public readonly metadata: ContractMetadata,
    public readonly options?: TypinkRegistryOptions,
  ) {
    super(extractContractTypes(metadata));
  }

  findCodec<I = unknown, O = I>(typeId: TypeId): $.Shape<I, O> {
    const types = this.metadata.types;
    const typeDef = types.find(({ id }) => id == typeId)!;

    const $codec = super.findCodec<I, O>(typeId);

    const lazyType = isLazyType(typeDef.type.path);

    if (lazyType === KnownLazyType.MAPPING) {
      return this.#createLazyCodec(LazyMapping, $codec, typeDef);
    } else if (lazyType === KnownLazyType.LAZY) {
      return this.#createLazyCodec(LazyObject, $codec, typeDef);
    } else if (lazyType === KnownLazyType.STORAGE_VEC) {
      return this.#createLazyCodec(LazyStorageVec, $codec, typeDef);
    }

    return $codec;
  }

  /**
   * Creates a lazy codec for a given type ID, extracting only storage types that is lazy/non-packed storage.
   *
   * @param typeId The type ID to create a lazy codec for
   * @returns A shape codec containing only lazy/non-packed storage fields, or null if no lazy fields exist
   */
  createLazyCodec(typeId: TypeId): $.AnyShape | null {
    const typeDef = this.findType(typeId);

    // Check if this is a lazy storage type we want to keep
    const lazyType = isLazyType(typeDef.path);
    if (lazyType) return this.findCodec(typeId);

    // For non-lazy types, we need to recursively process the structure
    const { typeDef: def } = typeDef;

    // We only support Struct type for now.
    if (def.type === 'Struct') {
      const { fields } = def.value;

      if (fields.length === 0) {
        return null;
      }

      // Handle tuple-like structs (fields with undefined names)
      if (fields[0].name === undefined) {
        if (fields.length === 1) {
          // Single unnamed field - check if it contains lazy types
          return this.createLazyCodec(fields[0].typeId);
        } else {
          return null; // Unsupported Lazy Codec Structure
        }
      } else {
        // Named struct fields - create struct with only lazy fields
        const lazyFields: Record<string, $.AnyShape> = {};
        let hasLazyFields = false;

        for (const field of fields) {
          // Skip fields with undefined names in named structs
          if (field.name === undefined) continue;

          // Recursively check if this field contains lazy types
          const fieldCodec = this.createLazyCodec(field.typeId);

          // Only include fields that have lazy types
          if (fieldCodec) {
            lazyFields[field.name] = fieldCodec;
            hasLazyFields = true;
          }
        }

        // If no lazy fields, return null
        if (!hasLazyFields) {
          return null;
        }

        return $.Struct(lazyFields);
      }
    }

    return null;
  }

  #enhanceLazyCodec($codec: $.AnyShape, typeDef: ContractType) {
    const $Codec = $.Tuple($codec);

    // @ts-ignore
    $Codec.subDecode = () => {
      return [typeDef, this];
    };

    return $Codec;
  }

  #createLazyCodec<I = unknown, O = I>(
    LazyClazz: new (...args: any[]) => any,
    $codec: $.AnyShape,
    typeDef: ContractType,
  ): $.Shape<I, O> {
    // @ts-ignore
    return $.instance(LazyClazz, this.#enhanceLazyCodec($codec, typeDef), () => ({}));
  }

  decodeEvents(records: IEventRecord[], contract?: ContractAddress): ContractEvent[] {
    return records
      .filter(({ event }) => this.#isContractEmittedEvent(event, contract)) // prettier-end-here
      .map((record) => this.decodeEvent(record, contract));
  }

  decodeEvent(eventRecord: IEventRecord, contract?: ContractAddress): ContractEvent {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const { version } = this.metadata;

    switch (version) {
      case 5:
        // TODO fix me
        return this.isRevive() // --
          ? this.#decodeEventV6(eventRecord)
          : this.#decodeEventV5(eventRecord);
      case '4':
        return this.#decodeEventV4(eventRecord);
      default:
        throw new DedotError('Unsupported metadata version!');
    }
  }

  #isContractEmittedEvent<Pallet extends KnownPallets = 'Contracts'>(
    event: IRuntimeEvent,
    contractAddress?: ContractAddress,
  ): event is ContractEmittedEvent<Pallet> {
    const eventMatched =
      (this.isRevive() // --
        ? event.pallet === 'Revive'
        : event.pallet === 'Contracts') &&
      typeof event.palletEvent === 'object' &&
      event.palletEvent.name === 'ContractEmitted';

    if (!eventMatched) return false;

    if (contractAddress) {
      // @ts-ignore
      const emittedContract = event.palletEvent.data?.contract;

      if (this.isRevive()) {
        return emittedContract === contractAddress;
      } else if (emittedContract instanceof AccountId32) {
        return emittedContract.eq(contractAddress);
      } else {
        return false;
      }
    }

    return true;
  }

  #decodeEventV4(eventRecord: IEventRecord): ContractEvent {
    assert(this.metadata.version === '4', 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord.event), 'Invalid ContractEmitted Event');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const index = data.at(0);
    assert(index !== undefined, 'Unable to decode event index!');

    const event = this.metadata.spec.events[index];
    assert(event, `Event index not found: ${index.toString()}`);

    return this.#tryDecodeEvent(event, data.subarray(1));
  }

  #decodeEventV5(eventRecord: IEventRecord): ContractEvent {
    assert(this.metadata.version === 5, 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord.event), 'Invalid ContractEmitted Event');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const signatureTopic = eventRecord.topics.at(0);

    let eventMeta: ContractEventMeta | undefined;
    if (signatureTopic) {
      eventMeta = this.metadata.spec.events.find((one) => one.signature_topic === signatureTopic);
    }

    // TODO: Handle multiple anonymous events
    // If `event` does not exist, it means it's an anonymous event
    // that does not contain a signature topic in the metadata.
    if (!eventMeta) {
      const potentialEvents = this.metadata.spec.events.filter(
        (one) => !one.signature_topic && one.args.filter((arg) => arg.indexed).length === eventRecord.topics.length,
      );

      assert(potentialEvents.length === 1, 'Unable to determine event!');
      eventMeta = potentialEvents[0];
    }

    return this.#tryDecodeEvent(eventMeta, data);
  }

  #decodeEventV6(eventRecord: IEventRecord): ContractEvent {
    // TODO this should be version 6, FIX ME
    assert(this.metadata.version === 5, 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent<'Revive'>(eventRecord.event), 'Invalid ContractEmitted Event');

    const eventData = eventRecord.event.palletEvent.data;
    const data = hexToU8a(eventData.data);
    const signatureTopic = eventData.topics.at(0);

    let eventMeta: ContractEventMeta | undefined;
    if (signatureTopic) {
      eventMeta = this.metadata.spec.events.find((one) => one.signature_topic === signatureTopic);
    }

    // TODO: Handle multiple anonymous events
    // If `event` does not exist, it means it's an anonymous event
    // that does not contain a signature topic in the metadata.
    if (!eventMeta) {
      const potentialEvents = this.metadata.spec.events.filter(
        (one) => !one.signature_topic && one.args.filter((arg) => arg.indexed).length === eventRecord.topics.length,
      );

      assert(potentialEvents.length === 1, 'Unable to determine event!');
      eventMeta = potentialEvents[0];
    }

    return this.#tryDecodeEvent(eventMeta, data);
  }

  #tryDecodeEvent(eventMeta: ContractEventMeta, raw: Uint8Array): ContractEvent {
    const { args, label } = eventMeta;

    const eventCodecFrame = args.reduce((frame, arg) => {
      const {
        label,
        type: { type },
      } = arg;

      const $codec = this.findCodec(type);
      Object.assign(frame, { [stringCamelCase(label)]: $codec });

      return frame;
    }, {} as any);

    const $eventCodec = $.Struct(eventCodecFrame);
    const data = $eventCodec.decode(raw);
    const name = stringPascalCase(label);

    return args.length ? { name, data } : { name };
  }

  /**
   * Check if the contract is Revive Compatible (ink!v6)
   */
  isRevive(): boolean {
    // TODO move to check via contract metadata version 6
    return this.metadata.source.language
      .toLowerCase() // --
      .startsWith('ink! 6.');
  }
}
