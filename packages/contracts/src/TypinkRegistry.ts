import { AccountId32, AccountId32Like, Bytes, TypeId, TypeRegistry } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { IEventRecord, IRuntimeEvent } from '@dedot/types';
import { assert, concatU8a, DedotError, hexToU8a, stringCamelCase, stringPascalCase, toU8a } from '@dedot/utils';
import { AnyLayout, ContractEvent, ContractEventMeta, ContractMetadata, ContractType } from './types/index.js';
import { extractContractTypes } from './utils.js';

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

// TODO fix duplications
const KNOWN_LAZY_TYPES = {
  MAPPING: ['ink_storage', 'lazy', 'mapping', 'Mapping'].join('::'),
  LAZY: ['ink_storage', 'lazy', 'Lazy'].join('::'),
  STORAGE_VEC: ['ink_storage', 'lazy', 'vec', 'StorageVec'].join('::'),
};

const findRootKey = (layout: AnyLayout, targetId: number): string | undefined => {
  if (layout.root) {
    if (layout.root.ty === targetId) {
      return layout.root.root_key;
    } else {
      const potentialKey = findRootKey(layout.root.layout, targetId);
      if (potentialKey) return potentialKey;
    }
  } else if (layout.array) {
    const potentialKey = findRootKey(layout.array.layout, targetId);
    if (potentialKey) return potentialKey;
  } else if (layout.enum) {
    for (const one of Object.values(layout.enum.variants)) {
      for (const structField of one.fields) {
        const potentialKey = findRootKey(structField.layout, targetId);
        if (potentialKey) return potentialKey;
      }
    }
  } else if (layout.leaf) {
    if (layout.leaf.ty === targetId) {
      return layout.leaf.key;
    } else {
      return undefined;
    }
  } else if (layout.struct) {
    for (const structField of layout.struct.fields) {
      const potentialKey = findRootKey(structField.layout, targetId);
      if (potentialKey) return potentialKey;
    }
  }

  throw new Error(`Layout Not Supported: ${JSON.stringify(layout)}`);
};

export class TypinkRegistry extends TypeRegistry {
  readonly #metadata: ContractMetadata;

  constructor(
    metadata: ContractMetadata,
    public getStorage?: (key: Uint8Array) => Promise<Bytes | undefined>,
  ) {
    super(extractContractTypes(metadata));

    this.#metadata = metadata;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  findCodec<I = unknown, O = I>(typeId: TypeId): $.Shape<I, O> {
    const types = this.metadata.types;
    const typeDef = types.find(({ id }) => id == typeId)!;

    const $codec = super.findCodec<I, O>(typeId);

    // const typeDef = this.findType(typeId);
    const typePath = typeDef.type.path?.join('::');
    if (typePath === KNOWN_LAZY_TYPES.MAPPING) {
      return this.#createLazyMappingCodec($codec, typeDef);
    } else if (typePath === KNOWN_LAZY_TYPES.LAZY) {
      return this.#createLazyCodec($codec, typeDef);
    }

    return $codec;
  }

  createUnpackedCodec(typeId: TypeId): $.AnyShape | null {
    const typeDef = this.findType(typeId);

    // Check if this is a lazy storage type we want to keep
    const typePath = typeDef.path.join('::');
    if (
      typePath &&
      (typePath === KNOWN_LAZY_TYPES.MAPPING ||
        typePath === KNOWN_LAZY_TYPES.LAZY ||
        typePath === KNOWN_LAZY_TYPES.STORAGE_VEC)
    ) {
      // For lazy types, use the existing codec creation methods
      const $codec = this.findCodec(typeId);

      // Get the contract type definition for lazy codecs
      const contractTypeDef = this.metadata.types.find(({ id }) => id == typeId)!;

      if (typePath === KNOWN_LAZY_TYPES.MAPPING) {
        return this.#createLazyMappingCodec($codec, contractTypeDef);
      } else if (typePath === KNOWN_LAZY_TYPES.LAZY) {
        return this.#createLazyCodec($codec, contractTypeDef);
      } else {
        // For other lazy types, return the standard codec
        return $codec;
      }
    }

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

  #createLazyMappingCodec<I = unknown, O = I>($codec: $.AnyShape, typeDef: ContractType): $.Shape<I, O> {
    const registry = this;

    class LazyMapping {
      constructor() {}

      async get(key: any) {
        const {
          id,
          type: { params },
        } = typeDef;

        const [keyType, valueType] = params!;
        const $Key = registry.findCodec(keyType.type);
        const $Value = registry.findCodec(valueType.type);

        const rootLayout = registry.metadata.storage;
        const rootKey = findRootKey(rootLayout as AnyLayout, id);
        assert(rootKey, 'Storage Root Key Not Found');

        const encodedKey = $Key.tryEncode(key);
        const storageKey = concatU8a(toU8a(rootKey), encodedKey);
        const rawValue = await registry.getStorage?.(storageKey);

        if (rawValue) {
          return $Value.tryDecode(rawValue);
        }

        return undefined;
      }
    }

    // @ts-ignore
    return $.instance(LazyMapping, $.Tuple($codec), () => ({}));
  }

  #createLazyCodec<I = unknown, O = I>($codec: $.AnyShape, typeDef: ContractType): $.Shape<I, O> {
    const registry = this;

    class LazyObject {
      constructor() {}

      async get() {
        const {
          id,
          type: { params },
        } = typeDef;

        const [valueType] = params!;
        const $Value = registry.findCodec(valueType.type);

        const rootLayout = registry.metadata.storage;
        const rootKey = findRootKey(rootLayout as AnyLayout, id);
        assert(rootKey, 'Root Key Not Found');

        const rawValue = await registry.getStorage?.(toU8a(rootKey));

        if (rawValue) {
          return $Value.tryDecode(rawValue);
        }

        return undefined;
      }
    }

    // @ts-ignore
    return $.instance(LazyObject, $.Tuple($codec), () => ({}));
  }

  decodeEvents(records: IEventRecord[], contract?: AccountId32Like): ContractEvent[] {
    return records
      .filter(({ event }) => this.#isContractEmittedEvent(event, contract)) // prettier-end-here
      .map((record) => this.decodeEvent(record, contract));
  }

  decodeEvent(eventRecord: IEventRecord, contract?: AccountId32Like): ContractEvent {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const { version } = this.#metadata;

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
    assert(this.#metadata.version === '4', 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord.event), 'Invalid ContractEmitted Event');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const index = data.at(0);
    assert(index !== undefined, 'Unable to decode event index!');

    const event = this.#metadata.spec.events[index];
    assert(event, `Event index not found: ${index.toString()}`);

    return this.#tryDecodeEvent(event, data.subarray(1));
  }

  #decodeEventV5(eventRecord: IEventRecord): ContractEvent {
    assert(this.#metadata.version === 5, 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord.event), 'Invalid ContractEmitted Event');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const signatureTopic = eventRecord.topics.at(0);

    let eventMeta: ContractEventMeta | undefined;
    if (signatureTopic) {
      eventMeta = this.#metadata.spec.events.find((one) => one.signature_topic === signatureTopic);
    }

    // TODO: Handle multiple anonymous events
    // If `event` does not exist, it means it's an anonymous event
    // that does not contain a signature topic in the metadata.
    if (!eventMeta) {
      const potentialEvents = this.#metadata.spec.events.filter(
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
