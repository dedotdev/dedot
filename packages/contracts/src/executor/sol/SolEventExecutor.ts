import { isEventRecord } from '@dedot/api';
import { GenericSubstrateApi, IEventRecord, IRuntimeEvent, Unsub } from '@dedot/types';
import { assert } from '@dedot/utils';
import { decodeEventLog } from 'viem/utils';
import { ContractAddress, ContractEvent, GenericContractEvent, SolABIEvent } from '../../types/index.js';
import { ContractEmittedEvent } from '../../utils';
import { SolContractExecutor } from './abstract';

export class SolEventExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(eventName: string): GenericContractEvent<string, any, 'sol'> {
    const fragment = this.#findEventFragment(eventName);

    assert(fragment, 'Fragment event not found!');

    const is = (event: IEventRecord | ContractEvent): event is ContractEvent => {
      if (isEventRecord(event)) {
        try {
          event = this.decodeEvent(event, this.address);
        } catch {
          return false;
        }
      }

      return event.name === eventName;
    };

    const find = (events: IEventRecord[] | ContractEvent[]): ContractEvent | undefined => {
      if (!events || events.length === 0) return undefined;

      if (isEventRecord(events[0])) {
        return this.decodeEvents(events as IEventRecord[], this.address).find(is);
      } else {
        return (events as ContractEvent[]).find(is);
      }
    };

    const filter = (events: IEventRecord[] | ContractEvent[]): ContractEvent[] => {
      if (isEventRecord(events[0])) {
        return this.decodeEvents(events as IEventRecord[], this.address).filter(is);
      } else {
        return (events as ContractEvent[]).filter(is);
      }
    };

    const watch = (callback: (events: ContractEvent[]) => void): Promise<Unsub> => {
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

  #findEventFragment(fragment: string): SolABIEvent | undefined {
    return this.abi.find((one) => one.type === 'event' && one.name === fragment) as SolABIEvent;
  }

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

  #isContractEmittedEvent(
    event: IRuntimeEvent,
    contractAddress?: ContractAddress,
  ): event is ContractEmittedEvent<'Revive'> {
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
