import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import type { AsyncMethod, Callback, GenericStorageQuery, PaginationOptions, Unsub } from '@dedot/types';
import { assert, isFunction, isObject } from '@dedot/utils';
import { type BaseStorageQuery, LegacyStorageQuery, QueryableStorage } from '../storage/index.js';
import { Executor } from './Executor.js';
import { buildCompatibilityError, type ParamSpec } from './validation-helpers.js';

const DEFAULT_KEYS_PAGE_SIZE = 1000;
const DEFAULT_ENTRIES_PAGE_SIZE = 250;

/**
 * @name StorageQueryExecutor
 * @description Execute a query to on-chain storage
 */
export class StorageQueryExecutor extends Executor {
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

      // Validate storage inputs before encoding (only for non-subscription queries)
      if (!callback) {
        this.#validateStorageInputs(entry, inArgs.at(0));
      }

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
      const startKey = pagination?.startKey;

      return await this.client.rpc.state_getKeysPaged(
        entry.encodeKey(partialInput, true),
        pageSize,
        startKey,
        this.atBlockHash,
      );
    };

    const extractArgs = (args: any[]): [any[], PaginationOptions | undefined] => {
      const inArgs = args.slice();
      const lastArg = args.at(-1);
      const pagination =
        isObject(lastArg) && ('pageSize' in lastArg || 'startKey' in lastArg) ? inArgs.pop() : undefined;

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

    const entries = async (...args: any[]): Promise<Array<[any, any]>> => {
      const [inArgs] = extractArgs(args);
      const allEntries: Array<[any, any]> = [];
      let startKey: StorageKey | undefined;

      while (true) {
        const pagination = {
          pageSize: DEFAULT_ENTRIES_PAGE_SIZE,
          ...(startKey ? { startKey } : {}),
        };

        const storageKeys = await rawKeys(inArgs, pagination);
        if (storageKeys.length === 0) break;

        const storageMap = await this.queryStorage(storageKeys, this.atBlockHash);
        const pageEntries: Array<[any, any]> = storageKeys.map((key) => [
          entry.decodeKey(key),
          entry.decodeValue(storageMap[key]),
        ]);

        allEntries.push(...pageEntries);

        if (storageKeys.length < DEFAULT_ENTRIES_PAGE_SIZE) break;

        startKey = storageKeys[storageKeys.length - 1];
      }

      return allEntries;
    };

    return { entries, pagedKeys, pagedEntries };
  }

  /**
   * Validate storage query inputs before encoding
   * @param entry - QueryableStorage instance
   * @param keyInput - Input keys to validate
   */
  #validateStorageInputs(entry: QueryableStorage, keyInput: any): void {
    const { storageType } = entry.storageEntry;

    // Plain storage doesn't require validation
    if (storageType.type === 'Plain') {
      return;
    }

    if (storageType.type === 'Map') {
      const { hashers, keyTypeId } = storageType.value;
      const requiredKeys = hashers.length;

      // Extract keyTypeIds for multi-key storage
      let keyTypeIds = [keyTypeId];
      if (hashers.length > 1) {
        const { typeDef } = this.registry.findType(keyTypeId);
        assert(typeDef.type === 'Tuple', 'Key type should be a tuple!');
        keyTypeIds = typeDef.value.fields;
      }

      // Normalize input to array format
      let keys: any[];
      if (requiredKeys === 1) {
        // Single key: accept both single value or array
        keys = Array.isArray(keyInput) ? keyInput : [keyInput];
      } else {
        // Multiple keys: must be array
        keys = keyInput;
      }

      // Build parameter specs for error messages
      const paramSpecs: ParamSpec[] = keyTypeIds.map((typeId, index) => ({
        name: `key${index}`,
        typeId,
      }));

      // Create tuple codec for validation
      const $ParamsTuple = $.Tuple(...keyTypeIds.map((id) => this.registry.findCodec(id)));

      // Validate inputs
      try {
        $ParamsTuple.assert?.(keys);
      } catch (error: any) {
        if (error.name === 'ShapeAssertError') {
          throw buildCompatibilityError(
            error,
            paramSpecs,
            keys,
            {
              apiName: `${entry.pallet.name}.${entry.storageEntry.name}`,
              type: 'storage',
            },
            this.registry,
          );
        }
        throw error;
      }
    }
  }

  protected getStorageQuery(): BaseStorageQuery {
    return new LegacyStorageQuery(this.client as any);
  }

  protected async queryStorage(keys: StorageKey[], hash?: BlockHash): Promise<Record<StorageKey, Option<StorageData>>> {
    return this.getStorageQuery().query(keys, hash);
  }

  protected subscribeStorage(keys: StorageKey[], callback: Callback<Array<StorageData | undefined>>): Promise<Unsub> {
    return this.getStorageQuery().subscribe(keys, (results) => {
      callback(keys.map((key) => results[key]));
    });
  }
}
