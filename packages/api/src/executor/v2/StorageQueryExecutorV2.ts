import type { AsyncMethod, Callback, PaginationOptions, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';
import { HexString } from '@dedot/utils';
import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import { HashOrSource, ISubstrateClient } from '../../types.js';
import { ChainHead, ChainHeadEvent } from '../../json-rpc/index.js';
import { QueryableStorage } from 'dedot/storage/QueryableStorage';

/**
 * @name StorageQueryExecutorV2
 */
export class StorageQueryExecutorV2<
  ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi,
> extends StorageQueryExecutor<ChainApi> {
  constructor(
    api: ISubstrateClient<ChainApi[RpcVersion]>,
    public chainHead: ChainHead,
    atBlockHash?: HashOrSource,
  ) {
    super(api, atBlockHash);
  }

  protected override exposeStorageMapMethods(entry: QueryableStorage): Record<string, AsyncMethod> {
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
    at?: HashOrSource,
  ): Promise<Record<StorageKey, Option<StorageData>>> {
    const hash = await this.toBlockHash(at);
    const results = await this.chainHead.storage(
      keys.map((key) => ({ type: 'value', key })),
      undefined,
      hash,
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
    let initialHash: BlockHash = this.chainHead.bestHash;
    let eventToListen: ChainHeadEvent = 'bestBlock';
    if (this.hashOrSource === 'finalized') {
      initialHash = this.chainHead.finalizedHash;
      eventToListen = 'finalizedBlock';
    }

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

    const onNewBlock = async (hash: BlockHash) => {
      await pull(hash);
    };

    this.chainHead.on(eventToListen, onNewBlock);
    return async () => {
      this.chainHead.off(eventToListen, onNewBlock);
    };
  }
}
