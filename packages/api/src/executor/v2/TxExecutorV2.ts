import { TxExecutor } from '../TxExecutor.js';
import { IRuntimeTxCall, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { assert } from '@dedot/utils';
import { SubmittableExtrinsicV2 } from '../../extrinsic/index.js';
import { ISubstrateClient } from '../../types.js';
import { DedotClient } from '../../client/index.js';

/**
 * @name TxExecutor
 * @description Execute a transaction instruction, returns a submittable extrinsic
 */
export class TxExecutorV2<
  ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi,
> extends TxExecutor<ChainApi> {
  constructor(api: ISubstrateClient<ChainApi[RpcVersion]>) {
    super(api);
    assert(api.rpcVersion === 'v2', 'JsonRpcV2-based client is required');
  }

  protected override createExtrinsic(call: IRuntimeTxCall): any {
    return new SubmittableExtrinsicV2(this.api as DedotClient, call);
  }
}
