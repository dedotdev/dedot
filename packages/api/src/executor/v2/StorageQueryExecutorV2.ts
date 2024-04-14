import type { GenericSubstrateApi } from '@dedot/types';
import type { StorageChangeSet } from '@dedot/specs';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';
import { HexString } from '@dedot/utils';
import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import { ISubstrateClient, HashOrSource } from '../../types.js';
import { ChainHead, ChainHeadEvent } from '../../json-rpc/index.js';

/**
 * @name StorageQueryExecutorV2
 */
export class StorageQueryExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends StorageQueryExecutor<ChainApi> {
  constructor(
    api: ISubstrateClient<ChainApi>,
    public chainHead: ChainHead,
    atBlockHash?: HashOrSource,
  ) {
    super(api, atBlockHash);
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

  protected override async subscribeStorage(keys: HexString[], cb: (changeSet: StorageChangeSet) => void) {
    let initialHash: BlockHash = this.chainHead.bestHash;
    let eventToListen: ChainHeadEvent = 'bestBlock';
    if (this.hashOrSource === 'finalized') {
      initialHash = this.chainHead.finalizedHash;
      eventToListen = 'finalizedBlock';
    }

    const latestChanges: Record<HexString, StorageData> = {};

    const pull = async (hash: BlockHash) => {
      const results = await this.queryStorage(keys, hash);
      const changes: Array<[HexString, StorageData]> = [];
      keys.forEach((key) => {
        const newValue = results[key] as StorageData;
        if (latestChanges[key] === newValue) return;

        changes.push([key, newValue]);
        latestChanges[key] = newValue;
      });

      if (changes.length === 0) return;
      cb({ block: hash, changes });
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
