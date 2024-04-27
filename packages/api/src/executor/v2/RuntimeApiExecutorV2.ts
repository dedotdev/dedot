import type { BlockHash } from '@dedot/codecs';
import type { GenericSubstrateApi } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import { ChainHead } from '../../json-rpc/index.js';
import { ISubstrateClientAt } from '../../types.js';
import { RuntimeApiExecutor, StateCallParams } from '../RuntimeApiExecutor.js';

/**
 * @name RuntimeApiExecutorV2
 */
export class RuntimeApiExecutorV2<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
> extends RuntimeApiExecutor<ChainApi> {
  constructor(
    api: ISubstrateClientAt<ChainApi>,
    public chainHead: ChainHead,
    atBlockHash?: BlockHash,
  ) {
    assert(api.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(api, atBlockHash);
  }

  protected override stateCall(callParams: StateCallParams): Promise<HexString> {
    const { func, params, at } = callParams;

    return this.chainHead.call(func, params, at);
  }
}
