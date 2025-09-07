import { IRuntimeTxCall, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
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
  constructor(readonly client: DedotClient<ChainApi>) {
    assert(client.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(client);
  }

  protected override createExtrinsic(call: IRuntimeTxCall): any {
    return new SubmittableExtrinsicV2(this.client, call);
  }
}
