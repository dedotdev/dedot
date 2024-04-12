import type { GenericSubstrateApi } from '@dedot/types';
import type { StorageChangeSet } from '@dedot/specs';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';
import { HexString } from '@dedot/utils';
import { BlockHash, Option, StorageData } from '@dedot/codecs';
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

  async toBlockHash(hashOrSource?: HashOrSource): Promise<BlockHash | undefined> {
    if (hashOrSource === 'best') return;
    if (hashOrSource === 'finalized') {
      return this.chainHead.finalizedHash as BlockHash;
    }

    return hashOrSource;
  }

  protected override async getStorage(key: HexString, at?: HashOrSource): Promise<Option<StorageData>> {
    const hash = await this.toBlockHash(at);
    const result = await this.chainHead.storage([{ type: 'value', key }], undefined, hash);
    const storageResult = result.find((r) => r.key === key);
    return storageResult?.value as HexString;
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
      const results = await Promise.all(keys.map((key) => this.getStorage(key, hash)));
      const changes: Array<[HexString, StorageData]> = [];
      keys.forEach((key, idx) => {
        const result = results[idx] as StorageData;
        if (latestChanges[key] === result) return;

        changes.push([key, result]);
        latestChanges[key] = result;
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
