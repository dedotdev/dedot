import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { Executor } from './Executor';
import { QueryableStorage } from '../storage/QueryableStorage.ts';

export class StorageQueryExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, storage: string) {
    return async (arg?: unknown) => {
      const entry = new QueryableStorage(this.registry, pallet, storage);
      const result = await this.api.rpc.state.getStorage(entry.encodeKey(arg));
      return entry.decodeValue(result);
    };
  }
}
