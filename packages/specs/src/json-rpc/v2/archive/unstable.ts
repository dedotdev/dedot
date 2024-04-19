import { BlockHash, Option } from '@dedot/codecs';
import { GenericJsonRpcApis } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { ArchiveStorageResult, MethodResult, PaginatedStorageQuery } from '../types/index.js';

/**
 * archive-prefixed JSON-RPC methods.
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/53bcbb15f1de62661671ad8099b9dc3f8b623efd/substrate/client/rpc-spec-v2/src/archive/api.rs#L27-L107
 *
 * @version unstable
 */
export interface ArchiveUnstable extends GenericJsonRpcApis {
  /**
   * Retrieves the body (list of transactions) of a given block hash.
   * Returns an array of strings containing the hexadecimal-encoded SCALE-codec-encoded
   * transactions in that block. If no block with that hash is found, null.
   *
   * @param hash
   * @version unstable
   */
  archive_unstable_body(hash: BlockHash): Promise<Option<Array<HexString>>>;

  /**
   * Get the chain's genesis hash.
   * Returns a string containing the hexadecimal-encoded hash of the genesis block of the chain.
   *
   * @version unstable
   */
  archive_unstable_genesisHash(): Promise<HexString>;

  /**
   * Get the block's header.
   * Returns a string containing the hexadecimal-encoded SCALE-codec encoding header of the
   * block.
   *
   * @param hash
   * @version unstable
   */
  archive_unstable_header(hash: BlockHash): Promise<Option<HexString>>;

  /**
   * Get the height of the current finalized block.
   * Returns an integer height of the current finalized block of the chain.
   *
   * @version unstable
   */
  archive_unstable_finalizedHeight(): Promise<number>;

  /**
   * Get the hashes of blocks from the given height.
   * Returns an array (possibly empty) of strings containing an hexadecimal-encoded hash of a
   * block header.
   *
   * @param height
   * @version unstable
   */
  archive_unstable_hashByHeight(height: number): Promise<Array<HexString>>;

  /**
   * Call into the Runtime API at a specified block's state.
   *
   * @param hash
   * @param func
   * @param params
   * @version unstable
   */
  archive_unstable_call(hash: BlockHash, func: string, params: string): Promise<MethodResult>;

  /**
   * Returns storage entries at a specific block's state.
   *
   * @param hash
   * @param items
   * @param childTrie
   * @version unstable
   */
  archive_unstable_storage(
    hash: BlockHash,
    items: Array<PaginatedStorageQuery>,
    childTrie?: Option<HexString>,
  ): Promise<ArchiveStorageResult>;
}
