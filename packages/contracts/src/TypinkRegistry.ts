import { AccountId32, Bytes, TypeRegistry } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { IEventRecord, IRuntimeEvent } from '@dedot/types';
import { DedotError, assert, hexToU8a, stringCamelCase, stringPascalCase } from '@dedot/utils';
import { ContractEvent, ContractEventMeta, ContractMetadata } from './types/index.js';
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

export class TypinkRegistry extends TypeRegistry {
  readonly #metadata: ContractMetadata;

  constructor(metadata: ContractMetadata) {
    super(extractContractTypes(metadata));

    this.#metadata = metadata;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  decodeEvents(records: IEventRecord[]): ContractEvent[] {
    return records
      .filter(({ event }) => this.#isContractEmittedEvent(event)) // prettier-end-here
      .map((record) => this.decodeEvent(record));
  }

  decodeEvent(eventRecord: IEventRecord): ContractEvent {
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

  #isContractEmittedEvent(event: IRuntimeEvent): event is ContractEmittedEvent {
    // @ts-ignore
    return event.pallet === 'Contracts' && event.palletEvent.name === 'ContractEmitted';
  }

  #decodeEventV4(eventRecord: IEventRecord): ContractEvent {
    assert(this.#metadata.version === '4', 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord.event), 'Event Record is not valid!');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const index = data.at(0);
    assert(index !== undefined, 'Unable to decode event index!');

    const event = this.#metadata.spec.events[index];
    assert(event, `Event index not found: ${index.toString()}`);

    return this.#tryDecodeEvent(event, data.subarray(1));
  }

  #decodeEventV5(eventRecord: IEventRecord): ContractEvent {
    assert(this.#metadata.version === 5, 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord.event), 'Event Record is not valid!');

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
