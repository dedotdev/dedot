import { BlockHash, Option } from '@dedot/codecs';
import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { FollowEvent, MethodResponse, StorageQuery } from '../types/index.js';

/**
 * chainHead-prefixed JSON-RPC methods.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/7430f413503f8008fe60eb2e4ebd76d14af12ea9/substrate/client/rpc-spec-v2/src/chain_head/api.rs#L33-L154
 *
 * @version unstable
 */
export interface ChainHeadUnstable extends GenericJsonRpcApis {
  /**
   * Track the state of the head of the chain: the finalized, non-finalized, and best blocks.
   *
   * @pubsub chainHead_unstable_followEvent, chainHead_unstable_follow, chainHead_unstable_unfollow
   * @version unstable
   */
  chainHead_unstable_follow(withRuntime: boolean, callback: Callback<FollowEvent>): Promise<Unsub>;
  /**
   * Retrieves the body (list of transactions) of a pinned block.
   * This method should be seen as a complement to `chainHead_unstable_follow`,
   * allowing the JSON-RPC client to retrieve more information about a block
   * that has been reported.
   *
   * Use `archive_unstable_body` if instead you want to retrieve the body of an arbitrary block.
   *
   * @rpcname chainHead_unstable_body
   * @version unstable
   */
  chainHead_unstable_body(subscriptionId: string, blockHash: BlockHash): Promise<MethodResponse>;

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
   * @version unstable
   */
  chainHead_unstable_header(subscriptionId: string, blockHash: BlockHash): Promise<Option<HexString>>;

  /**
   * Returns storage entries at a specific block's state.
   *
   * @rpcname chainHead_unstable_storage
   * @param subscriptionId
   * @param blockHash
   * @param items
   * @param childTrie
   * @version unstable
   */
  chainHead_unstable_storage(
    subscriptionId: string,
    blockHash: BlockHash,
    items: Array<StorageQuery>,
    childTrie?: string | null,
  ): Promise<MethodResponse>;

  /**
   * Call into the Runtime API at a specified block's state.
   *
   * @rpcname chainHead_unstable_call
   * @param subscriptionId
   * @param blockHash
   * @param func
   * @param params
   * @version unstable
   */
  chainHead_unstable_call(
    subscriptionId: string,
    blockHash: BlockHash,
    func: string,
    params: string,
  ): Promise<MethodResponse>;

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
   * @version unstable
   */
  chainHead_unstable_unpin(subscriptionId: string, hashes: BlockHash | BlockHash[]): Promise<void>;

  /**
   * Resumes a storage fetch started with `chainHead_storage` after it has generated an
   * `operationWaitingForContinue` event.
   *
   * @rpcname chainHead_unstable_continue
   * @param subscriptionId
   * @param operationId
   * @version unstable
   */
  chainHead_unstable_continue(subscriptionId: string, operationId: string): Promise<void>;
  /**
   * Stops an operation started with chainHead_unstable_body, chainHead_unstable_call, or
   * chainHead_unstable_storage. If the operation was still in progress, this interrupts it. If
   * the operation was already finished, this call has no effect.
   *
   * @rpcname chainHead_unstable_stopOperation
   * @param subscriptionId
   * @param operationId
   * @version unstable
   */
  chainHead_unstable_stopOperation(subscriptionId: string, operationId: string): Promise<void>;
}
