import { Bytes, H160, H256 } from '@dedot/codecs';
import { IEventRecord, IRuntimeEvent } from '@dedot/codecs/types';
import { assert } from '@dedot/utils';
import { EventFragment, Interface } from '@ethersproject/abi';
import { ContractAddress, SolContractEvent } from './types';

interface ContractEmittedEvent extends IRuntimeEvent {
  pallet: 'Revive';
  palletEvent: {
    name: 'ContractEmitted';
    data: {
      contract: H160;
      data: Bytes;
      topics: Array<H256>;
    };
  };
}

export class SolRegistry {
  constructor(public readonly interf: Interface) {}

  decodeEvents(records: IEventRecord[], contract: ContractAddress): SolContractEvent[] {
    return records
      .filter((eventRecord) => this.#isContractEmittedEvent(eventRecord.event, contract))
      .map((eventRecord) => this.decodeEvent(eventRecord, contract));
  }

  decodeEvent(eventRecord: IEventRecord, contract: ContractAddress) {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const signatureTopic = eventRecord.event.palletEvent.data.topics[0];
    const fragment = this.interf.getEvent(signatureTopic);

    return this.#tryDecodeEvent(fragment, eventRecord.event);
  }

  #tryDecodeEvent(fragment: EventFragment, event: ContractEmittedEvent): SolContractEvent {
    const data = this.interf.decodeEventLog(fragment, event.palletEvent.data.data, event.palletEvent.data.topics);

    return data.length > 0 ? { name: fragment.name, data } : { name: fragment.name };
  }

  #isContractEmittedEvent(event: IRuntimeEvent, contractAddress?: ContractAddress): event is ContractEmittedEvent {
    const eventMatched =
      typeof event.palletEvent === 'object' && // --
      event.palletEvent.name === 'ContractEmitted';

    if (!eventMatched) return false;

    if (contractAddress) {
      // @ts-ignore
      const emittedContract = event.palletEvent.data?.contract;

      return emittedContract === contractAddress;
    }

    return true;
  }
}
