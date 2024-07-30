import { isEventRecord } from '@dedot/api';
import { GenericSubstrateApi, IEventRecord } from '@dedot/types';
import { assert, stringPascalCase } from '@dedot/utils';
import { ContractEvent, ContractEventMeta, GenericContractEvent } from '../types/index.js';
import { Executor } from './Executor.js';

export class EventExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(eventName: string): GenericContractEvent {
    const eventMeta = this.#findEventMeta(eventName);

    assert(eventMeta, 'Contract event metadata not found!');

    const is = (event: IEventRecord | ContractEvent): event is ContractEvent => {
      if (isEventRecord(event)) {
        try {
          event = this.registry.decodeEvent(event);
        } catch {
          return false;
        }
      }

      return event.name === eventName;
    };

    const decodeEvents = (events: IEventRecord[]): ContractEvent[] => {
      const records = events.filter(this.api.events.contracts.ContractEmitted.is);
      return records.map((e) => this.registry.decodeEvent(e));
    };

    const find = (events: IEventRecord[] | ContractEvent[]): ContractEvent | undefined => {
      if (!events || events.length === 0) return undefined;

      if (isEventRecord(events[0])) {
        return decodeEvents(events as IEventRecord[]).find(is);
      } else {
        return (events as ContractEvent[]).find(is);
      }
    };

    const filter = (events: IEventRecord[] | ContractEvent[]): ContractEvent[] => {
      if (isEventRecord(events[0])) {
        return decodeEvents(events as IEventRecord[]).filter(is);
      } else {
        return (events as ContractEvent[]).filter(is);
      }
    };

    return {
      is,
      find,
      filter,
      meta: eventMeta,
    };
  }

  #findEventMeta(eventName: string): ContractEventMeta | undefined {
    return this.registry.metadata.spec.events.find((one) => stringPascalCase(one.label) === eventName);
  }
}
