import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { GenericSubstrateApi } from '@delightfuldot/types';
import { Executor } from './Executor';

export class StorageQueryExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, storage: string) {

  }
}
