import { isEventRecord } from '@dedot/api';
import { GenericSubstrateApi, IEventRecord, Unsub } from '@dedot/types';
import { assert } from '@dedot/utils';
import { EventFragment } from '@ethersproject/abi';
import { SolContractEvent, SolGenericContractEvent } from '../../types/index.js';
import { SolContractExecutor } from './abstract';

export class SolEventExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(eventName: string): SolGenericContractEvent {
    const fragment = this.#findEventFragment(eventName);

    assert(fragment, 'Fragment event not found!');

    const is = (event: IEventRecord | SolContractEvent): event is SolContractEvent => {
      if (isEventRecord(event)) {
        try {
          event = this.registry.decodeEvent(event, this.address);
        } catch {
          return false;
        }
      }

      return event.name === eventName;
    };

    const find = (events: IEventRecord[] | SolContractEvent[]): SolContractEvent | undefined => {
      if (!events || events.length === 0) return undefined;

      if (isEventRecord(events[0])) {
        return this.registry.decodeEvents(events as IEventRecord[], this.address).find(is);
      } else {
        return (events as SolContractEvent[]).find(is);
      }
    };

    const filter = (events: IEventRecord[] | SolContractEvent[]): SolContractEvent[] => {
      if (isEventRecord(events[0])) {
        return this.registry.decodeEvents(events as IEventRecord[], this.address).filter(is);
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

  #findEventFragment(fragment: string): EventFragment | undefined {
    return this.registry.interf.fragments.find((one) => one.type === 'event' && one.name === fragment) as EventFragment;
  }
}
