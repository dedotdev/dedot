import type { SubstrateApi } from '../chaintypes/index.js';
import type { Callback, GenericStorageQuery, GenericSubstrateApi, Unsub } from '@dedot/types';
import type { StorageChangeSet } from '@dedot/specs';
import { Executor } from './Executor.js';
import { QueryableStorage } from '../storage/QueryableStorage.js';
import { assert, HexString, isFunction } from '@dedot/utils';
import { Option, StorageData, StorageKey } from '@dedot/codecs';
import { HashOrSource } from 'dedot/types';

/**
 * @name StorageQueryExecutor
 * @description Execute a query to on-chain storage
 */
export class StorageQueryExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  doExecute(pallet: string, storage: string): GenericStorageQuery {
    const entry = new QueryableStorage(this.registry, pallet, storage);

    const extractArgs = (args: any[]): [any[], Callback | undefined] => {
      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const callback = isFunction(lastArg) ? inArgs.pop() : undefined;

      return [inArgs, callback];
    };

    const queryFn: GenericStorageQuery = async (...args: any[]) => {
      const [inArgs, callback] = extractArgs(args);
      const encodedKey = entry.encodeKey(inArgs.at(0));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.subscribeStorage([encodedKey], (changeSet: StorageChangeSet) => {
          const targetChange = changeSet.changes.find((change) => change[0] === encodedKey);

          targetChange && callback(entry.decodeValue(targetChange[1]));
        });
      } else {
        const result = await this.getStorage(encodedKey, this.hashOrSource);
        return entry.decodeValue(result);
      }
    };

    const queryMultiFn = async (...args: any[]) => {
      const [inArgs, callback] = extractArgs(args);
      const multiArgs = inArgs.at(0);
      assert(Array.isArray(multiArgs), 'First param for multi query should be an array');
      const encodedKeys = multiArgs.map((arg) => entry.encodeKey(arg));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.api.rpc.state_subscribeStorage(encodedKeys, (changeSet: StorageChangeSet) => {
          const targetChanges = changeSet.changes.filter((change) => encodedKeys.includes(change[0]));

          callback(targetChanges.map((value) => entry.decodeValue(value[1])));
        });
      } else {
        const queries = encodedKeys.map((key) => this.getStorage(key, this.hashOrSource));
        return (await Promise.all(queries)).map((result) => entry.decodeValue(result));
      }
    };

    const key = (...args: any[]): StorageKey => {
      const [inArgs] = extractArgs(args);
      return entry.encodeKey(inArgs.at(0));
    };

    queryFn.multi = queryMultiFn;
    queryFn.key = key;
    queryFn.meta = {
      pallet: entry.pallet.name,
      palletIndex: entry.pallet.index,
      ...entry.storageEntry,
    };

    // TODO keyPrefix
    // TODO entries
    // TODO keys
    // TODO keysPaged

    return queryFn;
  }

  protected async getStorage(key: HexString, at?: HashOrSource): Promise<Option<StorageData>> {
    const hash = await this.toBlockHash(at);
    return this.api.rpc.state_getStorage(key, hash);
  }

  protected subscribeStorage(keys: HexString[], cb: (changeSet: StorageChangeSet) => void): Promise<Unsub> {
    // TODO support subscribe to finalized storage
    if (this.hashOrSource === 'finalized') {
      throw new Error('Subscribe to finalized storage is not supported');
    }

    return this.api.rpc.state_subscribeStorage(keys, cb);
  }
}
