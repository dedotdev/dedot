import { BlockHash, Option } from '@dedot/codecs';
import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { HexString } from '@dedot/utils';
import {
  ArchiveStorageResult,
  ArchiveStorageDiffResult,
  ArchiveStorageDiffItem,
  ArchiveStorageEventType,
  ArchiveStorageDiffEventType,
  MethodResult,
  PaginatedStorageQuery,
} from '../types/index.js';

/**
 * archive-prefixed JSON-RPC methods.
 * Ref: https://paritytech.github.io/json-rpc-interface-spec/api/archive.html
 *
 * @version v1
 */
export interface ArchiveV1 extends GenericJsonRpcApis {
  /**
   * Retrieves the body (list of transactions) of a given block hash.
   * Returns an array of strings containing the hexadecimal-encoded SCALE-codec-encoded
   * transactions in that block. If no block with that hash is found, null.
   *
   * @param hash
   * @version v1
   */
  archive_v1_body(hash: BlockHash): Promise<Option<Array<HexString>>>;

  /**
   * Get the chain's genesis hash.
   * Returns a string containing the hexadecimal-encoded hash of the genesis block of the chain.
   *
   * @version v1
   */
  archive_v1_genesisHash(): Promise<HexString>;

  /**
   * Get the block's header.
   * Returns a string containing the hexadecimal-encoded SCALE-codec encoding header of the
   * block.
   *
   * @param hash
   * @version v1
   */
  archive_v1_header(hash: BlockHash): Promise<Option<HexString>>;

  /**
   * Get the height of the current finalized block.
   * Returns an integer height of the current finalized block of the chain.
   *
   * @version v1
   */
  archive_v1_finalizedHeight(): Promise<number>;

  /**
   * Get the hashes of blocks from the given height.
   * Returns an array (possibly empty) of strings containing an hexadecimal-encoded hash of a
   * block header.
   *
   * @param height
   * @version v1
   */
  archive_v1_hashByHeight(height: number): Promise<Array<HexString>>;

  /**
   * Call into the Runtime API at a specified block's state.
   *
   * @param hash
   * @param func
   * @param params
   * @version v1
   */
  archive_v1_call(hash: BlockHash, func: string, params: string): Promise<MethodResult>;


  /**
   * Returns the storage difference between two blocks via subscription.
   *
   * @pubsub archive_v1_storageDiffEvent, archive_v1_storageDiff, archive_v1_stopStorageDiff
   * @param hash
   * @param items
   * @param previousHash
   * @param childTrie
   * @param callback
   * @version v1
   */
  archive_v1_storageDiff(
    hash: BlockHash,
    items: Array<ArchiveStorageDiffItem>,
    previousHash: Option<BlockHash>,
    childTrie: Option<HexString>,
    callback: Callback<ArchiveStorageDiffEventType>,
  ): Promise<Unsub>;

  /**
   * Stop an ongoing storage operation.
   *
   * @param operationId
   * @version v1
   */
  archive_v1_stopStorage(operationId: string): Promise<void>;

  /**
   * Stop an ongoing storage diff operation.
   *
   * @param operationId
   * @version v1
   */
  archive_v1_stopStorageDiff(operationId: string): Promise<void>;
}