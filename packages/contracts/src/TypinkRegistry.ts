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
