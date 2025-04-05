import { BlockHash, Option, StorageData, StorageKey } from '@dedot/codecs';
import type { AsyncMethod, Callback, GenericSubstrateApi, Unsub } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { ChainHead, ChainHeadEvent, PinnedBlock } from '../../json-rpc/index.js';
import { NewStorageQueryService } from '../../storage/NewStorageQueryService.js';
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
      const key = withArgs ? entry.encodeKey(args, true) : entry.prefixKey;

      const results = await this.chainHead.storage([
        { type: 'descendantsValues', key },
      ]);
      return results.map(({ key, value }) => [
        entry.decodeKey(key as HexString),
        entry.decodeValue(value as HexString),
      ]);
    };

    return { entries };
  }

  // Override queryStorage and subscribeStorage methods to use NewStorageQueryService directly
  protected override async queryStorage(keys: StorageKey[], hash?: BlockHash): Promise<Record<StorageKey, Option<StorageData>>> {
    // Use NewStorageQueryService directly with chainHead
    const service = new NewStorageQueryService(this.client as any);
    const results = await service.query(keys);
    
    // Convert array results to record format
    return keys.reduce((o, key, i) => {
      o[key] = results[i];
      return o;
    }, {} as Record<StorageKey, Option<StorageData>>);
  }

  protected override subscribeStorage(keys: StorageKey[], callback: Callback<Array<StorageData | undefined>>): Promise<Unsub> {
    // Use NewStorageQueryService directly with chainHead
    const service = new NewStorageQueryService(this.client as any);
    return service.subscribe(keys, callback);
  }
}
