import type { RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { RuntimeApiExecutor, StateCallParams } from '../RuntimeApiExecutor.js';
import { HashOrSource, ISubstrateClient } from '../../types.js';
import { ChainHead } from '../../json-rpc/index.js';

/**
 * @name RuntimeApiExecutorV2
 */
export class RuntimeApiExecutorV2<
  ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi,
> extends RuntimeApiExecutor<ChainApi> {
  constructor(
    api: ISubstrateClient<ChainApi[RpcVersion]>,
    public chainHead: ChainHead,
    atBlockHash?: HashOrSource,
  ) {
    super(api, atBlockHash);
  }

  protected override stateCall(callParams: StateCallParams): Promise<unknown> {
    const { func, params, at } = callParams;
    return this.chainHead.call(func, params, at);
  }
}
