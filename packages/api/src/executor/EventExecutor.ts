import { GenericPalletEvent, GenericSubstrateApi, PalletEvent } from '@delightfuldot/types';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { Executor } from './Executor';
import { stringCamelCase, stringPascalCase } from '@polkadot/util';

export class EventExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, errorName: string): GenericPalletEvent<string, string> {
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
    };
  }
}
