import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import type { AsyncMethod, Callback, GenericSubstrateApi } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { ChainHead, ChainHeadEvent, PinnedBlock } from '../../json-rpc/index.js';
import { QueryableStorage } from '../../storage/QueryableStorage.js';
import { ISubstrateClientAt } from '../../types.js';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';

/**
 * @name StorageQueryExecutorV2
 */
export class StorageQueryExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends StorageQueryExecutor<ChainApi> {
  constructor(
    client: ISubstrateClientAt<ChainApi>,
    public chainHead: ChainHead,
    atBlockHash?: BlockHash,
  ) {
    assert(client.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(client, atBlockHash);
  }

  protected override exposeStorageMapMethods(entry: QueryableStorage): Record<string, AsyncMethod> {
    // chainHead_storage does not support pagination
    // so for now we're trying to pull all entries from storage
    // this might take a while for large storage
    // TODO improve this, fallback to use `archive`-prefixed if available?
    const entries = async (...args: any[]): Promise<Array<[any, any]>> => {
      const withArgs = !!args && args.length > 0;
      const results = await this.chainHead.storage([
        { type: 'descendantsValues', key: withArgs ? entry.encodePartialKey(args) : entry.prefixKey },
      ]);
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
    let best: PinnedBlock = await this.chainHead.bestBlock();
    let eventToListen: ChainHeadEvent = 'bestBlock';

    // TODO subscribe to finalized data source
    // initialHash = this.chainHead.finalizedHash;
    // eventToListen = 'finalizedBlock';

    const latestChanges: Map<HexString, StorageData | undefined> = new Map();

    const pull = async ({ hash }: PinnedBlock) => {
      const results = await this.queryStorage(keys, hash);
      let changed = false;
      keys.forEach((key) => {
        const newValue = results[key] as StorageData;
        if (latestChanges.size > 0 && latestChanges.get(key) === newValue) return;

        changed = true;
        latestChanges.set(key, newValue);
      });

      if (!changed) return;
      callback(keys.map((key) => latestChanges.get(key)));
    };

    await pull(best);

    const unsub = this.chainHead.on(eventToListen, pull);

    return async () => {
      unsub();
    };
  }
}
