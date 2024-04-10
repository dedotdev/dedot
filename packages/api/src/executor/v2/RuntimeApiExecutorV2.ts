import type { GenericSubstrateApi } from '@dedot/types';
import { RuntimeApiExecutor, StateCallParams } from '../RuntimeApiExecutor.js';
import { BlockHash } from '@dedot/codecs';
import { ISubstrateClient } from '../../types.js';
import { ChainHead } from '../../json-rpc/index.js';

/**
 * @name RuntimeApiExecutorV2
 */
export class RuntimeApiExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends RuntimeApiExecutor<ChainApi> {
  constructor(
    api: ISubstrateClient<ChainApi>,
    public chainHead: ChainHead,
    atBlockHash?: BlockHash,
  ) {
    super(api, atBlockHash);
  }

  protected override stateCall(callParams: StateCallParams): Promise<unknown> {
    const { func, params, at } = callParams;
    return this.chainHead.call(func, params, at);
  }
}
