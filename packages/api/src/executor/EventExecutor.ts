import { GenericPalletEvent, GenericSubstrateApi, PalletEvent } from '@delightfuldot/types';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { Executor } from './Executor';
import { stringCamelCase, stringPascalCase } from '@polkadot/util';
import { assert } from '@delightfuldot/utils';

export class EventExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, errorName: string): GenericPalletEvent<string, string> {
    const targetPallet = this.getPallet(pallet);

    const eventTypeId = targetPallet.event;
    assert(eventTypeId, `Not found event with id ${eventTypeId} in pallet ${pallet}`);

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
    assert(def, `Event def not found for id ${eventTypeId}`);

    const { tag, value } = def.type;
    assert(tag === 'Enum', `Event type should be an enum, found: ${tag}`);

    const eventDef = value.members.find(({ name }) => stringPascalCase(name) === errorName);
    assert(eventDef, `Event def not found for ${errorName}`);

    return {
      ...eventDef,
      fieldCodecs: eventDef.fields.map(({ typeId }) => this.registry.findPortableCodec(typeId)),
    };
  }
}
