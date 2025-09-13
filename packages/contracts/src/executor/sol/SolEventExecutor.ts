import { isEventRecord } from '@dedot/api';
import { Bytes, H160, H256 } from '@dedot/codecs';
import { GenericSubstrateApi, IEventRecord, IRuntimeEvent, Unsub } from '@dedot/types';
import { assert } from '@dedot/utils';
import { EventFragment } from '@ethersproject/abi';
import { ContractAddress, SolContractEvent, SolGenericContractEvent } from '../../types/index.js';
import { SolContractExecutor } from './abstract';

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

export class SolEventExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(eventName: string): SolGenericContractEvent {
    const fragment = this.#findEventFragment(eventName);

    assert(fragment, 'Fragment event not found!');

    const is = (event: IEventRecord | SolContractEvent): event is SolContractEvent => {
      if (isEventRecord(event)) {
        try {
          event = this.#decodeEvent(event, this.address);
        } catch {
          return false;
        }
      }

      return event.name === eventName;
    };

    const find = (events: IEventRecord[] | SolContractEvent[]): SolContractEvent | undefined => {
      if (!events || events.length === 0) return undefined;

      if (isEventRecord(events[0])) {
        return this.#decodeEvents(events as IEventRecord[], this.address).find(is);
      } else {
        return (events as SolContractEvent[]).find(is);
      }
    };

    const filter = (events: IEventRecord[] | SolContractEvent[]): SolContractEvent[] => {
      if (isEventRecord(events[0])) {
        return this.#decodeEvents(events as IEventRecord[], this.address).filter(is);
      } else {
        return (events as SolContractEvent[]).filter(is);
      }
    };

    const watch = (callback: (events: SolContractEvent[]) => void): Promise<Unsub> => {
      return this.client.query.system.events((records: IEventRecord[]) => {
        const events = filter(records);

        if (events.length === 0) return;

        callback(filter(records));
      });
    };

    return {
      is,
      find,
      filter,
      meta: fragment,
      watch,
    };
  }

  #decodeEvents(records: IEventRecord[], contract: ContractAddress): SolContractEvent[] {
    return records
      .filter((eventRecord) => this.#isContractEmittedEvent(eventRecord.event, contract))
      .map((eventRecord) => this.#decodeEvent(eventRecord, contract));
  }

  #decodeEvent(eventRecord: IEventRecord, contract: ContractAddress) {
    assert(this.#isContractEmittedEvent(eventRecord.event, contract), 'Invalid ContractEmitted Event');

    const signatureTopic = eventRecord.event.palletEvent.data.topics[0];
    const fragment = this.interf.getEvent(signatureTopic);

    return this.#tryDecodeEvent(fragment, eventRecord.event);
  }

  #tryDecodeEvent(fragment: EventFragment, event: ContractEmittedEvent): SolContractEvent {
    const data = this.interf.decodeEventLog(fragment, event.palletEvent.data.data, event.palletEvent.data.topics);

    return data.length > 0 ? { name: fragment.name, data } : { name: fragment.name };
  }

  #findEventFragment(fragment: string): EventFragment | undefined {
    return this.interf.fragments.find((one) => one.type === 'event' && one.name === fragment) as EventFragment;
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
