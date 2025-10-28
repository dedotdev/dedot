import type { BlockHash } from '@dedot/codecs';
import { assert, HexString } from '@dedot/utils';
import { ChainHead } from '../../json-rpc/index.js';
import { ISubstrateClient, ISubstrateClientAt } from '../../types.js';
import { StateCallParams } from '../Executor.js';
import { RuntimeApiExecutor } from '../RuntimeApiExecutor.js';

/**
 * @name RuntimeApiExecutorV2
 */
export class RuntimeApiExecutorV2 extends RuntimeApiExecutor {
  constructor(
    client: ISubstrateClientAt<any, any> | ISubstrateClient<any, any, any>,
    public chainHead: ChainHead,
    atBlockHash?: BlockHash,
  ) {
    assert(client.rpcVersion === 'v2', 'Only supports JSON-RPC v2');
    super(client, atBlockHash);
  }

  protected override stateCall(callParams: StateCallParams): Promise<HexString> {
    const { func, params, at } = callParams;

    return this.chainHead.call(func, params, at);
  }
}
