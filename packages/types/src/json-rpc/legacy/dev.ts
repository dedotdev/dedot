import { BlockHash, Option } from '@dedot/codecs';
import { GenericJsonRpcApis } from '@dedot/types';
import { BlockStats } from './types/index.js';

export interface DevJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Reexecute the specified `block_hash` and gather statistics while doing so.
   *
   * This function requires the specified block and its parent to be available
   * at the queried node. If either the specified block or the parent is pruned,
   * this function will return `None`.
   *
   * @rpcname dev_getBlockStats
   * @param {BlockHash} at
   **/
  dev_getBlockStats: (at?: BlockHash) => Promise<Option<BlockStats>>;
}
