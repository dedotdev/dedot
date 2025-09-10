import type { GenericSubstrateApi } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { ChainHead } from '../../json-rpc/index.js';
import { ISubstrateClient, ISubstrateClientAt } from '../../types.js';
import { StateCallParams } from '../Executor.js';
import { ViewFunctionExecutor } from '../ViewFunctionExecutor.js';

/**
 * @name ViewFunctionExecutorV2
 */
export class ViewFunctionExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends ViewFunctionExecutor<ChainApi> {
  constructor(
    client: ISubstrateClientAt<ChainApi> | ISubstrateClient<ChainApi, any>,
    public chainHead: ChainHead,
  ) {
    assert(client.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(client);
  }

  protected override stateCall(callParams: StateCallParams): Promise<HexString> {
    const { func, params, at } = callParams;

    return this.chainHead.call(func, params, at);
  }
}
