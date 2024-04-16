import type { GenericPalletEvent, PalletEvent, VersionedGenericSubstrateApi } from '@dedot/types';
import { Executor } from './Executor.js';
import { assert, stringCamelCase, stringPascalCase, UnknownApiError } from '@dedot/utils';

/**
 * @name EventExecutor
 * @description Find pallet event information from metadata
 */
export class EventExecutor<
  ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi,
> extends Executor<ChainApi> {
  doExecute(pallet: string, errorName: string): GenericPalletEvent<any, string, string> {
    const targetPallet = this.getPallet(pallet);

    const eventTypeId = targetPallet.event;
    assert(eventTypeId, new UnknownApiError(`Not found event with id ${eventTypeId} in pallet ${pallet}`));

    const eventDef = this.#getEventDef(eventTypeId, errorName);

    const is = (event: PalletEvent): event is PalletEvent => {
      const palletCheck = stringCamelCase(event.pallet) === pallet;
      if (typeof event.palletEvent === 'string') {
        return palletCheck && stringPascalCase(event.palletEvent) === errorName;
      } else if (typeof event.palletEvent === 'object') {
        return palletCheck && stringPascalCase(event.palletEvent.name) === errorName;
      }

      return false;
    };

    const as = (event: PalletEvent): PalletEvent | undefined => {
      return is(event) ? event : undefined;
    };

    return {
      is,
      as,
      meta: {
        ...eventDef,
        pallet: targetPallet.name,
        palletIndex: targetPallet.index,
      },
    };
  }

  #getEventDef(eventTypeId: number, errorName: string) {
    const def = this.metadata.types[eventTypeId];
    assert(def, new UnknownApiError(`Event def not found for id ${eventTypeId}`));

    const { tag, value } = def.type;
    assert(tag === 'Enum', new UnknownApiError(`Event type should be an enum, found: ${tag}`));

    const eventDef = value.members.find(({ name }) => stringPascalCase(name) === errorName);
    assert(eventDef, new UnknownApiError(`Event def not found for ${errorName}`));

    return {
      ...eventDef,
      fieldCodecs: eventDef.fields.map(({ typeId }) => this.registry.findCodec(typeId)),
    };
  }
}
