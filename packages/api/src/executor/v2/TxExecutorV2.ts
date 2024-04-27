import { GenericSubstrateApi, IRuntimeTxCall, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { assert } from '@dedot/utils';
import { DedotClient } from '../../client/index.js';
import { SubmittableExtrinsicV2 } from '../../extrinsic/index.js';
import { TxExecutor } from '../TxExecutor.js';

/**
 * @name TxExecutor
 * @description Execute a transaction instruction, returns a submittable extrinsic
 */
export class TxExecutorV2<
  ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi,
> extends TxExecutor<ChainApi[RpcVersion]> {
  constructor(api: DedotClient<ChainApi>) {
    assert(api.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(api);
  }

  protected override createExtrinsic(call: IRuntimeTxCall): any {
    return new SubmittableExtrinsicV2(this.api as DedotClient, call);
  }
}
