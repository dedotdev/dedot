import type { SubstrateApi } from '@dedot/chaintypes';
import { GenericStorageQuery, GenericSubstrateApi } from '@dedot/types';
import { StorageChangeSet } from '@dedot/specs';
import { Executor } from './Executor.js';
import { QueryableStorage } from '../storage/QueryableStorage.js';
import { assert, isFunction } from '@dedot/utils';

/**
 * @name StorageQueryExecutor
 * @description Execute a query to on-chain storage
 */
export class StorageQueryExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  doExecute(pallet: string, storage: string): GenericStorageQuery {
    const entry = new QueryableStorage(this.registry, pallet, storage);

    const queryFn: GenericStorageQuery = async (...args: any[]) => {
      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const callback = isFunction(lastArg) ? inArgs.pop() : undefined;
      const encodedKey = entry.encodeKey(inArgs.at(0));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.api.jsonrpc.state_subscribeStorage([encodedKey], (changeSet: StorageChangeSet) => {
          const targetChange = changeSet.changes.find((change) => change[0] === encodedKey);

          targetChange && callback(entry.decodeValue(targetChange[1]));
        });
      } else {
        const result = await this.api.jsonrpc.state_getStorage(encodedKey, this.atBlockHash);
        return entry.decodeValue(result);
      }
    };

    const queryMultiFn = async (...args: any[]) => {
      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const callback = isFunction(lastArg) ? inArgs.pop() : undefined;
      const multiArgs = inArgs.at(0);
      assert(Array.isArray(multiArgs), 'First param for multi query should be an array');
      const encodedKeys = multiArgs.map((arg) => entry.encodeKey(arg));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.api.jsonrpc.state_subscribeStorage(encodedKeys, (changeSet: StorageChangeSet) => {
          const targetChanges = changeSet.changes.filter((change) => encodedKeys.includes(change[0]));

          callback(targetChanges.map((value) => entry.decodeValue(value[1])));
        });
      } else {
        const queries = encodedKeys.map((key) => this.api.jsonrpc.state_getStorage(key, this.atBlockHash));
        return (await Promise.all(queries)).map((result) => entry.decodeValue(result));
      }
    };

    queryFn.multi = queryMultiFn;
    queryFn.meta = {
      pallet: entry.pallet.name,
      palletIndex: entry.pallet.index,
      ...entry.storageEntry,
    };

    return queryFn;
  }
}
