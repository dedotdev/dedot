import { BlockHash } from '@dedot/codecs';
import type { AsyncMethod } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { ChainHead } from '../../json-rpc/index.js';
import { type BaseStorageQuery, NewStorageQuery, QueryableStorage } from '../../storage/index.js';
import { ISubstrateClient, ISubstrateClientAt } from '../../types.js';
import { StorageQueryExecutor } from '../StorageQueryExecutor.js';

/**
 * @name StorageQueryExecutorV2
 */
export class StorageQueryExecutorV2 extends StorageQueryExecutor {
  constructor(
    client: ISubstrateClientAt<any> | ISubstrateClient<any, any>,
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

      const results = await this.chainHead.storage([{ type: 'descendantsValues', key }]);
      return results.map(({ key, value }) => [
        entry.decodeKey(key as HexString),
        entry.decodeValue(value as HexString),
      ]);
    };

    return { entries };
  }

  protected override getStorageQuery(): BaseStorageQuery {
    // @ts-ignore little trick to make querying data client.at instance works here,
    // TODO need to rethink about this
    if (!this.client['chainHead']) this.client['chainHead'] = this.chainHead;

    return new NewStorageQuery(this.client as any);
  }
}
