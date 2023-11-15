import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { GenericSubstrateApi, StorageChangeSet } from '@delightfuldot/types';
import { Executor } from './Executor';
import { QueryableStorage } from '../storage/QueryableStorage';
import { isFunction } from '@polkadot/util';

export class StorageQueryExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, storage: string) {
    return async (...args: any[]) => {
      const entry = new QueryableStorage(this.registry, pallet, storage);

      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const callback = isFunction(lastArg) ? inArgs.pop() : undefined;
      const encodedKey = entry.encodeKey(inArgs.at(0));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.api.rpc.state.subscribeStorage([encodedKey], (changeSet: StorageChangeSet) => {
          const targetChange = changeSet.changes.find((change) => change[0] === encodedKey);

          targetChange && callback(entry.decodeValue(targetChange[1]));
        });
      } else {
        const result = await this.api.rpc.state.getStorage(encodedKey);
        return entry.decodeValue(result);
      }
    };
  }
}
