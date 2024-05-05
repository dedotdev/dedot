import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import type { AsyncMethod, Callback, GenericSubstrateApi } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { QueryableStorage } from 'dedot/storage/QueryableStorage';
import { ChainHead, ChainHeadEvent } from '../../json-rpc/index.js';
import { ISubstrateClientAt } from '../../types.js';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';

/**
 * @name StorageQueryExecutorV2
 */
export class StorageQueryExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends StorageQueryExecutor<ChainApi> {
  constructor(
    api: ISubstrateClientAt<ChainApi>,
    public chainHead: ChainHead,
    atBlockHash?: BlockHash,
  ) {
    assert(api.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(api, atBlockHash);
  }

  protected override exposeStorageMapMethods(entry: QueryableStorage): Record<string, AsyncMethod> {
    // chainHead_storage does not support pagination
    // so for now we're trying to pull all entries from storage
    // this might take a while for large storage
    // TODO improve this, fallback to use `archive`-prefixed if available?
    const entries = async (): Promise<Array<[any, any]>> => {
      const results = await this.chainHead.storage([{ type: 'descendantsValues', key: entry.prefixKey }]);
      return results.map(({ key, value }) => [
        entry.decodeKey(key as HexString),
        entry.decodeValue(value as HexString),
      ]);
    };

    return { entries };
  }

  protected override async queryStorage(
    keys: StorageKey[],
    at?: BlockHash,
  ): Promise<Record<StorageKey, Option<StorageData>>> {
    const results = await this.chainHead.storage(
      keys.map((key) => ({ type: 'value', key })),
      undefined,
      at,
    );

    return results.reduce(
      (o, r) => {
        o[r.key as StorageKey] = (r.value ?? undefined) as Option<StorageData>;
        return o;
      },
      {} as Record<StorageKey, Option<StorageData>>,
    );
  }

  protected override async subscribeStorage(keys: HexString[], callback: Callback<Array<StorageData | undefined>>) {
    let initialHash: BlockHash = await this.chainHead.bestHash();
    let eventToListen: ChainHeadEvent = 'bestBlock';

    // TODO subscribe to finalized data source
    // initialHash = this.chainHead.finalizedHash;
    // eventToListen = 'finalizedBlock';

    const latestChanges: Record<HexString, StorageData> = {};

    const pull = async (hash: BlockHash) => {
      const results = await this.queryStorage(keys, hash);
      let changed = false;
      keys.forEach((key) => {
        const newValue = results[key] as StorageData;
        if (latestChanges[key] === newValue) return;

        changed = true;
        latestChanges[key] = newValue;
      });

      if (!changed) return;
      callback(keys.map((key) => latestChanges[key]));
    };

    await pull(initialHash);

    const unsub = this.chainHead.on(eventToListen, pull);

    return async () => {
      unsub();
    };
  }
}
