import type {
  Callback,
  GenericStorageQuery,
  PaginationOptions,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';
import type { StorageChangeSet } from '@dedot/specs';
import { Executor } from './Executor.js';
import { QueryableStorage } from '../storage/QueryableStorage.js';
import { assert, isFunction } from '@dedot/utils';
import { Option, StorageData, StorageKey } from '@dedot/codecs';
import { HashOrSource } from '../types.js';

const DEFAULT_KEYS_PAGE_SIZE = 1000;
const DEFAULT_ENTRIES_PAGE_SIZE = 250;

/**
 * @name StorageQueryExecutor
 * @description Execute a query to on-chain storage
 */
export class StorageQueryExecutor<
  ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi,
> extends Executor<ChainApi> {
  doExecute(pallet: string, storage: string): GenericStorageQuery {
    const entry = new QueryableStorage(this.registry, pallet, storage);

    const extractArgs = (args: any[]): [any[], Callback | undefined] => {
      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const callback = isFunction(lastArg) ? inArgs.pop() : undefined;

      return [inArgs, callback];
    };

    const getStorageKey = (...args: any[]): StorageKey => {
      const [inArgs] = extractArgs(args);
      return entry.encodeKey(inArgs.at(0));
    };

    const getStorage = async (keys: StorageKey[]): Promise<Record<StorageKey, any>> => {
      const results = await this.queryStorage(keys, this.hashOrSource);

      return keys.reduce(
        (o, key) => {
          o[key] = entry.decodeValue(results[key]);
          return o;
        },
        {} as Record<StorageKey, any>,
      );
    };

    const queryFn: GenericStorageQuery = async (...args: any[]) => {
      const [inArgs, callback] = extractArgs(args);
      const encodedKey = entry.encodeKey(inArgs.at(0));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.subscribeStorage([encodedKey], (changes: Array<StorageData | undefined>) => {
          if (changes.length === 0) return;
          callback(entry.decodeValue(changes[0]));
        });
      } else {
        const results = await getStorage([encodedKey]);
        return results[encodedKey];
      }
    };

    const queryMultiFn = async (...args: any[]): Promise<any> => {
      const [inArgs, callback] = extractArgs(args);
      const multiArgs = inArgs.at(0);
      assert(Array.isArray(multiArgs), 'First param for multi query should be an array');
      const encodedKeys = multiArgs.map((arg) => entry.encodeKey(arg));

      // if a callback is passed, make a storage subscription and return an unsub function
      if (callback) {
        return await this.subscribeStorage(encodedKeys, (changes: Array<StorageData | undefined>) => {
          callback(changes.map((change) => entry.decodeValue(change)));
        });
      } else {
        const result = await getStorage(encodedKeys);
        return encodedKeys.map((key) => result[key]);
      }
    };

    queryFn.rawKey = getStorageKey;
    queryFn.meta = {
      pallet: entry.pallet.name,
      palletIndex: entry.pallet.index,
      ...entry.storageEntry,
    };
    queryFn.multi = queryMultiFn;

    const isMap = entry.storageEntry.type.tag === 'Map';
    if (isMap) {
      const rawKeys = async (pagination?: PaginationOptions): Promise<StorageKey[]> => {
        const pageSize = pagination?.pageSize || DEFAULT_KEYS_PAGE_SIZE;
        const startKey = pagination?.startKey || entry.prefixKey;

        return await this.api.rpc.state_getKeysPaged(
          entry.prefixKey,
          pageSize,
          startKey,
          await this.toBlockHash(this.hashOrSource),
        );
      };

      const keys = async (pagination?: PaginationOptions): Promise<any[]> => {
        const storageKeys = await rawKeys({ pageSize: DEFAULT_KEYS_PAGE_SIZE, ...pagination });
        return storageKeys.map((key) => entry.decodeKey(key));
      };

      const entries = async (pagination?: PaginationOptions): Promise<Array<[any, any]>> => {
        const storageKeys = await rawKeys({ pageSize: DEFAULT_ENTRIES_PAGE_SIZE, ...pagination });
        const storageMap = await this.queryStorage(storageKeys, this.hashOrSource);
        return storageKeys.map((key) => [entry.decodeKey(key), entry.decodeValue(storageMap[key])]);
      };

      // @ts-ignore
      queryFn.keys = keys;
      // @ts-ignore
      queryFn.entries = entries;
    }

    return queryFn;
  }

  protected async queryStorage(
    keys: StorageKey[],
    at?: HashOrSource,
  ): Promise<Record<StorageKey, Option<StorageData>>> {
    const hash = await this.toBlockHash(at);
    const changeSets: StorageChangeSet[] = await this.api.rpc.state_queryStorageAt(keys, hash);

    return changeSets[0].changes.reduce(
      (o, [key, value]) => {
        o[key] = value ?? undefined;
        return o;
      },
      {} as Record<StorageKey, Option<StorageData>>,
    );
  }

  protected subscribeStorage(keys: StorageKey[], callback: Callback<Array<StorageData | undefined>>): Promise<Unsub> {
    // TODO support subscribe to finalized storage
    if (this.hashOrSource === 'finalized') {
      throw new Error('Subscribe to finalized storage is not supported');
    }

    const lastChanges = {} as Record<StorageKey, StorageData | undefined>;

    return this.api.rpc.state_subscribeStorage(keys, (changeSet: StorageChangeSet) => {
      changeSet.changes.forEach(([key, value]) => {
        if (lastChanges[key] !== value) {
          lastChanges[key] = value ?? undefined;
        }
      });

      return callback(keys.map((key) => lastChanges[key]));
    });
  }
}
