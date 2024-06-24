import { FrameSystemEventRecord } from '@dedot/api/chaintypes/index.js';
import { TypeRegistry } from '@dedot/codecs';
import { assert, hexToU8a, stringCamelCase, stringPascalCase } from '@dedot/utils';
import { ContractEvent, ContractEventMeta, ContractMetadata } from './types/index.js';
import { extractContractTypes } from './utils.js';
import * as $ from '@dedot/shape'

export class TypinkRegistry extends TypeRegistry {
  readonly #metadata: ContractMetadata;

  constructor(metadata: ContractMetadata) {
    super(extractContractTypes(metadata));

    this.#metadata = metadata;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  decodeEvent(eventRecord: FrameSystemEventRecord): ContractEvent | undefined {
    assert(this.#isContractEmittedEvent(eventRecord), 'Event Record is not valid!');

    if (this.#metadata.version === '4') {
      return this.#decodeEventV4(eventRecord);
    } else {
      // Latest version
      return this.#decodeEventV5(eventRecord);
    }
  }

  #isContractEmittedEvent(eventRecord: FrameSystemEventRecord): eventRecord is FrameSystemEventRecord & {
    event: { pallet: 'Contracts'; palletEvent: { name: 'ContractEmitted'; data: { data: any } } };
  } {
    return eventRecord.event.pallet === 'Contracts' && eventRecord.event.palletEvent.name === 'ContractEmitted';
  }

  #decodeEventV4(eventRecord: FrameSystemEventRecord): ContractEvent {
    assert(this.#isContractEmittedEvent(eventRecord), 'Event Record is not valid!');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const index = data.at(0);
    assert(index !== undefined, 'Unable to decode event index!');

    const event = this.#metadata.spec.events[index];
    assert(event, `Event index not found: ${index.toString()}`);

    return this.#tryDecodeEvent(event, data.subarray(1));
  }

  #decodeEventV5(eventRecord: FrameSystemEventRecord): ContractEvent {
    assert(this.#metadata.version == '5', 'Invalid metadata version!');
    assert(this.#isContractEmittedEvent(eventRecord), 'Event Record is not valid!');

    const data = hexToU8a(eventRecord.event.palletEvent.data.data);
    const signatureTopic = eventRecord.topics.at(0);

    // TODO: Handle multiple anonymous events
    if (!signatureTopic) {
      const potentialEvents = this.#metadata.spec.events.filter((one) => !one.signature_topic);
      assert(potentialEvents.length === 1, 'Unable to determine event!');

      return this.#tryDecodeEvent(potentialEvents[0], data);
    }

    const event = this.#metadata.spec.events.find((one) => one.signature_topic === signatureTopic);
    assert(event, `Unable to determine event!`);

    return this.#tryDecodeEvent(event, data);
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

    return args.length ? { name: stringPascalCase(label), data } : ({ name: stringPascalCase(label) } as ContractEvent);
  }
}
