import { Bytes, H160, H256 } from '@dedot/codecs';
import { IEventRecord, IRuntimeEvent } from '@dedot/codecs/types';
import { assert } from '@dedot/utils';
import { decodeEventLog } from 'viem/utils';
import { ContractAddress, SolAbi, ContractEvent } from './types';

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
  constructor(public readonly abi: SolAbi) {}

  decodeEvents(records: IEventRecord[], contract: ContractAddress): ContractEvent[] {
    return records
      .filter((eventRecord) => this.#isContractEmittedEvent(eventRecord.event, contract))
      .map((eventRecord) => this.decodeEvent(eventRecord, contract));
  }

  decodeEvent(eventRecord: IEventRecord, contract: ContractAddress) {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const event = eventRecord.event;
    const signatureTopic = event.palletEvent.data.topics[0];

    const { eventName, args: data } = decodeEventLog({
      abi: this.abi,
      data: event.palletEvent.data.data,
      topics: [signatureTopic, ...event.palletEvent.data.topics],
    });

    // @ts-ignore
    return data.length > 0 ? { name: eventName, data } : { name: eventName };
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
