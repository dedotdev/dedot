import { isEventRecord } from '@dedot/api';
import { GenericSubstrateApi, IEventRecord } from '@dedot/types';
import { assert, stringPascalCase } from '@dedot/utils';
import { ContractEvent, ContractEventMeta, GenericContractEvent } from '../types/index.js';
import { Executor } from './Executor.js';

export class EventExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(eventName: string): GenericContractEvent {
    const meta = this.#findEventMeta(eventName);

    assert(meta, 'Contract event metadata not found!');

    const is = (event: IEventRecord | ContractEvent): event is ContractEvent => {
      if (isEventRecord(event)) {
        try {
          event = this.registry.decodeEvent(event, this.address);
        } catch {
          return false;
        }
      }

      return event.name === eventName;
    };

    const find = (events: IEventRecord[] | ContractEvent[]): ContractEvent | undefined => {
      if (!events || events.length === 0) return undefined;

      if (isEventRecord(events[0])) {
        return this.registry.decodeEvents(events as IEventRecord[], this.address).find(is);
      } else {
        return (events as ContractEvent[]).find(is);
      }
    };

    const filter = (events: IEventRecord[] | ContractEvent[]): ContractEvent[] => {
      if (isEventRecord(events[0])) {
        return this.registry.decodeEvents(events as IEventRecord[], this.address).filter(is);
      } else {
        return (events as ContractEvent[]).filter(is);
      }
    };

    return {
      is,
      find,
      filter,
      meta,
    };
  }

  #findEventMeta(eventName: string): ContractEventMeta | undefined {
    return this.registry.metadata.spec.events.find((one) => stringPascalCase(one.label) === eventName);
  }
}
