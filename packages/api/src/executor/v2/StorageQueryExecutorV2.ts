import type { GenericSubstrateApi } from '@dedot/types';
import type { StorageChangeSet } from '@dedot/specs';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';
import { HexString } from '@dedot/utils';
import { BlockHash, Option, StorageData } from '@dedot/codecs';
import { ISubstrateClient } from '../../types.js';
import { ChainHead } from '../../json-rpc/index.js';

/**
 * @name StorageQueryExecutorV2
 */
export class StorageQueryExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends StorageQueryExecutor<ChainApi> {
  constructor(
    api: ISubstrateClient<ChainApi>,
    public chainHead: ChainHead,
    atBlockHash?: BlockHash,
  ) {
    super(api, atBlockHash);
  }
  protected override async getStorage(key: HexString, at?: BlockHash): Promise<Option<StorageData>> {
    const result = await this.chainHead.storage([{ type: 'value', key }], undefined, at);
    const storageResult = result.find((r) => r.key === key);
    return storageResult?.value as HexString;
  }

  protected override subscribeStorage(keys: HexString[], cb: (changeSet: StorageChangeSet) => void) {
    return this.api.rpc.state_subscribeStorage(keys, cb);
  }
}
