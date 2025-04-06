import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import type {
  AsyncMethod,
  Callback,
  GenericStorageQuery,
  GenericSubstrateApi,
  PaginationOptions,
  Unsub,
  WithPagination,
} from '@dedot/types';
import { assert, isFunction, isObject } from '@dedot/utils';
import { LegacyStorageQueryService } from '../storage/LegacyStorageQueryService.js';
import { QueryableStorage } from '../storage/QueryableStorage.js';
import { Executor } from './Executor.js';

const DEFAULT_KEYS_PAGE_SIZE = 1000;
const DEFAULT_ENTRIES_PAGE_SIZE = 250;

/**
 * @name StorageQueryExecutor
 * @description Execute a query to on-chain storage
 */
export class StorageQueryExecutor<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
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
      const results = await this.queryStorage(keys, this.atBlockHash);

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

    queryFn.rawKey = getStorageKey;
    queryFn.meta = {
      pallet: entry.pallet.name,
      palletIndex: entry.pallet.index,
      ...entry.storageEntry,
    };

    const isMap = entry.storageEntry.storageType.type === 'Map';
    if (isMap) {
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

      // @ts-ignore
      queryFn.multi = queryMultiFn;

      Object.assign(queryFn, this.exposeStorageMapMethods(entry));
    }

    return queryFn;
  }

  protected exposeStorageMapMethods(entry: QueryableStorage): Record<string, AsyncMethod> {
    const rawKeys = async (partialInput: any[], pagination?: PaginationOptions): Promise<StorageKey[]> => {
      const pageSize = pagination?.pageSize || DEFAULT_KEYS_PAGE_SIZE;
      const startKey = pagination?.startKey || entry.prefixKey;

      return await this.client.rpc.state_getKeysPaged(entry.encodeKey(partialInput, true), pageSize, startKey, this.atBlockHash);
    };

    const extractArgs = (args: any[]): [any[], PaginationOptions | undefined] => {
      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const pagination = isObject(lastArg) && ('pageSize' in lastArg || 'startKey' in lastArg) ? inArgs.pop() : undefined;

      return [inArgs, pagination];
    };

    const pagedKeys = async (...args: any[]): Promise<any[]> => {
      const [inArgs, pagination] = extractArgs(args);

      const storageKeys = await rawKeys(inArgs, { pageSize: DEFAULT_KEYS_PAGE_SIZE, ...pagination });
      return storageKeys.map((key) => entry.decodeKey(key));
    };

    const pagedEntries = async (...args: any[]): Promise<Array<[any, any]>> => {
      const [inArgs, pagination] = extractArgs(args);

      const storageKeys = await rawKeys(inArgs, { pageSize: DEFAULT_ENTRIES_PAGE_SIZE, ...pagination });
      const storageMap = await this.queryStorage(storageKeys, this.atBlockHash);
      return storageKeys.map((key) => [entry.decodeKey(key), entry.decodeValue(storageMap[key])]);
    };

    return { pagedKeys, pagedEntries };
  }

  protected async queryStorage(keys: StorageKey[], hash?: BlockHash): Promise<Record<StorageKey, Option<StorageData>>> {
    // Use LegacyStorageQueryService and pass the block hash
    const service = new LegacyStorageQueryService(this.client as any);
    const results = await service.query(keys, hash);
    
    // Convert array results to record format
    return keys.reduce((o, key, i) => {
      o[key] = results[i];
      return o;
    }, {} as Record<StorageKey, Option<StorageData>>);
  }

  protected subscribeStorage(keys: StorageKey[], callback: Callback<Array<StorageData | undefined>>): Promise<Unsub> {
    // Use LegacyStorageQueryService
    const service = new LegacyStorageQueryService(this.client as any);
    return service.subscribe(keys, callback);
  }
}
