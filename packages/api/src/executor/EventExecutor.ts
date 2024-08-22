import { PalletEventMetadataLatest } from '@dedot/codecs';
import { FlatEnum } from '@dedot/shape';
import type { GenericPalletEvent, GenericSubstrateApi, IEventRecord, PalletEvent, Unsub } from '@dedot/types';
import { assert, stringCamelCase, stringPascalCase, UnknownApiError } from '@dedot/utils';
import { Executor } from './Executor.js';
import { isEventRecord } from './utils.js';
import { EventRecord } from '@polkadot/types/interfaces/types.js';

/**
 * @name EventExecutor
 * @description Find pallet event information from metadata
 */
export class EventExecutor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> extends Executor<ChainApi> {
  doExecute(pallet: string, eventName: string): GenericPalletEvent {
    const targetPallet = this.getPallet(pallet);

    const eventTypeId = targetPallet.event;
    assert(eventTypeId, new UnknownApiError(`Not found event with id ${eventTypeId} in pallet ${pallet}`));

    const eventDef = this.#getEventDef(eventTypeId, eventName);

    const is = (event: IEventRecord | PalletEvent): event is PalletEvent => {
      if (isEventRecord(event)) {
        event = event.event;
      }

      const palletCheck = stringCamelCase(event.pallet) === pallet;
      if (typeof event.palletEvent === 'string') {
        return palletCheck && stringPascalCase(event.palletEvent) === eventName;
      } else if (typeof event.palletEvent === 'object') {
        return palletCheck && stringPascalCase(event.palletEvent.name) === eventName;
      }

      return false;
    };

    const find = (events: IEventRecord[] | PalletEvent[]): PalletEvent | undefined => {
      if (!events || events.length === 0) return undefined;

      if (isEventRecord(events[0])) {
        return (events as IEventRecord[]).map(({ event }) => event).find(is);
      } else {
        return (events as PalletEvent[]).find(is);
      }
    };

    const filter = (events: IEventRecord[] | PalletEvent[]): PalletEvent[] => {
      if (isEventRecord(events[0])) {
        return (events as IEventRecord[]).map(({ event }) => event).filter(is);
      } else {
        return (events as PalletEvent[]).filter(is);
      }
    };

    const watch = (callback: (events: PalletEvent[]) => void): Promise<Unsub> => {
      return this.client.query.system.events((records: IEventRecord[]) => callback(filter(records)));
    };

    const meta: PalletEventMetadataLatest = {
      ...eventDef,
      pallet: targetPallet.name,
      palletIndex: targetPallet.index,
    };

    return {
      is,
      find,
      filter,
      meta,
      watch,
    };
  }

  #getEventDef(eventTypeId: number, errorName: string) {
    const def = this.metadata.types[eventTypeId];
    assert(def, new UnknownApiError(`Event def not found for id ${eventTypeId}`));

    const { type, value } = def.typeDef;
    assert(type === 'Enum', new UnknownApiError(`Event type should be an enum, found: ${type}`));

    const eventDef = value.members.find(({ name }) => stringPascalCase(name) === errorName);
    assert(eventDef, new UnknownApiError(`Event def not found for ${errorName}`));

    return {
      ...eventDef,
      fieldCodecs: eventDef.fields.map(({ typeId }) => this.registry.findCodec(typeId)),
    };
  }
}
