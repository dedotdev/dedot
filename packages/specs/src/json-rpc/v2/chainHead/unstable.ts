import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { FollowEvent, MethodResponse, StorageQuery } from '../types/index.js';
import { BlockHash } from '@dedot/codecs';

export interface ChainHeadUnstable extends GenericJsonRpcApis {
  /**
   * Track the state of the head of the chain: the finalized, non-finalized, and best blocks.
   *
   * @pubsub chainHead_unstable_followEvent, chainHead_unstable_follow, chainHead_unstable_unfollow
   */
  chainHead_unstable_follow: (with_runtime: boolean, callback: Callback<FollowEvent>) => Promise<Unsub>;
  /**
   * Retrieves the body (list of transactions) of a pinned block.
   * This method should be seen as a complement to `chainHead_unstable_follow`,
   * allowing the JSON-RPC client to retrieve more information about a block
   * that has been reported.
   *
   * Use `archive_unstable_body` if instead you want to retrieve the body of an arbitrary block.
   *
   * @rpcname chainHead_unstable_body
   */
  chainHead_unstable_body: (subscriptionId: string, blockHash: BlockHash) => Promise<MethodResponse>;

  /**
   * Retrieves the header of a pinned block.
   *
   * This method should be seen as a complement to `chainHead_unstable_follow`,
   * allowing the JSON-RPC client to retrieve more information about a block
   * that has been reported.
   *
   * Use `archive_unstable_header` if instead you want to retrieve the header of an arbitrary
   * block.
   *
   * @rpcname chainHead_unstable_header
   * @param subscriptionId
   * @param blockHash
   */
  chainHead_unstable_header: (subscriptionId: string, blockHash: BlockHash) => Promise<MethodResponse>;

  /**
   * Returns storage entries at a specific block's state.
   *
   * @rpcname chainHead_unstable_storage
   * @param subscriptionId
   * @param blockHash
   * @param items
   * @param childTrie
   */
  chainHead_unstable_storage: (
    subscriptionId: string,
    blockHash: BlockHash,
    items: Array<StorageQuery>,
    childTrie?: string | null,
  ) => Promise<MethodResponse>;

  /**
   * Call into the Runtime API at a specified block's state.
   *
   * @rpcname chainHead_unstable_call
   * @param subscriptionId
   * @param blockHash
   * @param func
   * @param params
   */
  chainHead_unstable_call: (
    subscriptionId: string,
    blockHash: BlockHash,
    func: string,
    params: string,
  ) => Promise<MethodResponse>;

  /**
   * Unpin a block or multiple blocks reported by the `follow` method.
   *
   * Ongoing operations that require the provided block
   * will continue normally.
   *
   * When this method returns an error, it is guaranteed that no blocks have been unpinned.
   *
   * @rpcname chainHead_unstable_unpin
   * @param subscriptionId
   * @param hashes
   */
  chainHead_unstable_unpin: (subscriptionId: string, hashes: BlockHash | BlockHash[]) => Promise<void>;

  /**
   * Resumes a storage fetch started with `chainHead_storage` after it has generated an
   * `operationWaitingForContinue` event.
   *
   * @rpcname chainHead_unstable_continue
   * @param subscriptionId
   * @param operationId
   */
  chainHead_unstable_continue: (subscriptionId: string, operationId: string) => Promise<void>;
  /**
   * Stops an operation started with chainHead_unstable_body, chainHead_unstable_call, or
   * chainHead_unstable_storage. If the operation was still in progress, this interrupts it. If
   * the operation was already finished, this call has no effect.
   *
   * @rpcname chainHead_unstable_stopOperation
   * @param subscriptionId
   * @param operationId
   */
  chainHead_unstable_stopOperation: (subscriptionId: string, operationId: string) => Promise<void>;
}
