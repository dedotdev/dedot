import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { BlockHash, BlockNumber, Header, Option, SignedBlock } from '@dedot/codecs';

export interface ChainJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Get header and body of a relay chain block
   *
   * @rpcname chain_getBlock
   * @param {BlockHash} at
   **/
  chain_getBlock: (at?: BlockHash) => Promise<Option<SignedBlock>>;

  /**
   * Get the block hash for a specific block
   *
   * @rpcname chain_getBlockHash
   * @param {BlockNumber} blockNumber
   **/
  chain_getBlockHash: (blockNumber?: BlockNumber) => Promise<Option<BlockHash>>;

  /**
   * Get hash of the last finalized block in the canon chain
   *
   * @rpcname chain_getFinalizedHead
   **/
  chain_getFinalizedHead: () => Promise<BlockHash>;

  /**
   * Retrieves the header for a specific block
   *
   * @rpcname chain_getHeader
   * @param {BlockHash} at
   **/
  chain_getHeader: (at?: BlockHash) => Promise<Option<Header>>;

  /**
   * All head subscription.
   *
   * @subscription chain_allHead, chain_subscribeAllHeads, chain_unsubscribeAllHeads
   **/
  chain_subscribeAllHeads: (callback: Callback<Header>) => Promise<Unsub>;

  /**
   * Retrieves the best finalized header via subscription
   *
   * @subscription chain_finalizedHead, chain_subscribeFinalizedHeads, chain_unsubscribeFinalizedHeads
   **/
  chain_subscribeFinalizedHeads: (callback: Callback<Header>) => Promise<Unsub>;

  /**
   * Retrieves the best header via subscription
   *
   * @subscription chain_newHead, chain_subscribeNewHeads, chain_unsubscribeNewHeads
   **/
  chain_subscribeNewHeads: (callback: Callback<Header>) => Promise<Unsub>;
}
