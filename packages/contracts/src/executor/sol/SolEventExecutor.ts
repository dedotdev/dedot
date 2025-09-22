import { isEventRecord } from '@dedot/api';
import { GenericSubstrateApi, IEventRecord, Unsub } from '@dedot/types';
import { assert } from '@dedot/utils';
import { EventFragment } from '@ethersproject/abi';
import { ContractEvent, GenericContractEvent } from '../../types/index.js';
import { SolContractExecutor } from './abstract';

export class SolEventExecutor<ChainApi extends GenericSubstrateApi> extends SolContractExecutor<ChainApi> {
  doExecute(eventName: string): GenericContractEvent<string, any, 'sol'> {
    const fragment = this.#findEventFragment(eventName);

    assert(fragment, 'Fragment event not found!');

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
      meta: JSON.parse(fragment.format('json')),
      watch,
    };
  }

  #findEventFragment(fragment: string): EventFragment | undefined {
    return this.registry.interf.fragments.find((one) => one.type === 'event' && one.name === fragment) as EventFragment;
  }
}
