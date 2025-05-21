import { AccountId32, AccountId32Like, Bytes, TypeId, TypeRegistry } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { IEventRecord, IRuntimeEvent } from '@dedot/types';
import { assert, DedotError, HexString, hexToU8a, stringCamelCase, stringPascalCase } from '@dedot/utils';
import { LazyMapping, LazyObject, LazyStorageVec } from './storage/index.js';
import { ContractEvent, ContractEventMeta, ContractMetadata, ContractType } from './types/index.js';
import { extractContractTypes, isLazyType, KnownLazyType } from './utils.js';

interface ContractEmittedEvent extends IRuntimeEvent {
  pallet: 'Contracts';
  palletEvent: {
    name: 'ContractEmitted';
    data: {
      contract: AccountId32;
      data: Bytes;
    };
  };
}

export interface TypinkRegistryOptions {
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

  createUnpackedCodec(typeId: TypeId): $.AnyShape | null {
    const typeDef = this.findType(typeId);

    // Check if this is a lazy storage type we want to keep
    const lazyType = isLazyType(typeDef.path);
    if (lazyType) return this.findCodec(typeId);

    // For non-lazy types, we need to recursively process the structure
    const { typeDef: def } = typeDef;

    // Handle different type structures based on the type definition
    if (def.type === 'Struct') {
      const { fields } = def.value;

      if (fields.length === 0) {
        return null;
      }

      // Create a new struct with only lazy fields
      const lazyFields: Record<string, $.AnyShape> = {};
      let hasLazyFields = false;

      for (const field of fields) {
        if (field.name === undefined) continue;

        // Recursively check if this field contains lazy types
        const fieldCodec = this.createUnpackedCodec(field.typeId);

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
    } else if (def.type === 'Enum') {
      const { members } = def.value;

      if (members.length === 0) {
        return null;
      }

      // Process each enum variant
      const lazyVariants: Record<string, any> = {};
      let hasLazyVariants = false;

      for (const { fields, name, index } of members) {
        if (fields.length === 0) {
          continue;
        }

        // Check if any fields in this variant contain lazy types
        let hasLazyFields = false;
        const variantFields: Record<string, $.AnyShape> = {};

        for (const field of fields) {
          if (field.name === undefined && fields.length > 1) continue;

          const fieldCodec = this.createUnpackedCodec(field.typeId);
          if (fieldCodec) {
            if (field.name) {
              variantFields[field.name] = fieldCodec;
            }
            hasLazyFields = true;
          }
        }

        if (hasLazyFields) {
          lazyVariants[name] = {
            index,
            value:
              fields.length === 1 && fields[0].name === undefined
                ? this.createUnpackedCodec(fields[0].typeId)
                : $.Struct(variantFields),
          };
          hasLazyVariants = true;
        }
      }

      // If no lazy variants, return null
      if (!hasLazyVariants) {
        return null;
      }

      return $.Enum(lazyVariants);
    } else if (def.type === 'Tuple') {
      const { fields } = def.value;

      if (fields.length === 0) {
        return null;
      }

      // Check if any tuple elements contain lazy types
      const lazyElements: $.AnyShape[] = [];

      for (const fieldId of fields) {
        const elementCodec = this.createUnpackedCodec(fieldId);
        if (elementCodec) {
          lazyElements.push(elementCodec);
        }
      }

      // If no lazy elements, return null
      if (lazyElements.length === 0) {
        return null;
      }

      return $.Tuple(...lazyElements);
    } else if (def.type === 'Sequence') {
      // Check if the element type contains lazy types
      const elementTypeId = def.value.typeParam;
      const elementCodec = this.createUnpackedCodec(elementTypeId);

      // If element type doesn't contain lazy types, return null
      if (!elementCodec) {
        return null;
      }

      // Create appropriate vector codec
      return $.Vec(elementCodec);
    } else if (def.type === 'SizedVec') {
      // Check if the element type contains lazy types
      const elementTypeId = def.value.typeParam;
      const elementCodec = this.createUnpackedCodec(elementTypeId);

      // If element type doesn't contain lazy types, return null
      if (!elementCodec) {
        return null;
      }

      // Create appropriate sized vector codec
      return $.SizedVec(elementCodec, def.value.len);
    } else if (def.type === 'Compact') {
      // Check if the inner type contains lazy types
      const innerTypeId = def.value.typeParam;
      const innerCodec = this.createUnpackedCodec(innerTypeId);

      // If inner type doesn't contain lazy types, return null
      if (!innerCodec) {
        return null;
      }

      return $.compact(innerCodec);
    }

    // For primitive types and other non-container types, they don't contain lazy types
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

  decodeEvents(records: IEventRecord[], contract?: AccountId32Like): ContractEvent[] {
    return records
      .filter(({ event }) => this.#isContractEmittedEvent(event, contract)) // prettier-end-here
      .map((record) => this.decodeEvent(record, contract));
  }

  decodeEvent(eventRecord: IEventRecord, contract?: AccountId32Like): ContractEvent {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const { version } = this.metadata;

    switch (version) {
      case 5:
        return this.#decodeEventV5(eventRecord);
      case '4':
        return this.#decodeEventV4(eventRecord);
      default:
        throw new DedotError('Unsupported metadata version!');
    }
  }

  #isContractEmittedEvent(event: IRuntimeEvent, contract?: AccountId32Like): event is ContractEmittedEvent {
    const eventMatched =
      event.pallet === 'Contracts' &&
      typeof event.palletEvent === 'object' &&
      event.palletEvent.name === 'ContractEmitted';

    if (!eventMatched) return false;

    if (contract) {
      // @ts-ignore
      const emittedContract = event.palletEvent.data?.contract;
      if (emittedContract instanceof AccountId32) {
        return emittedContract.eq(contract);
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
}
