import { BlockHash, Option } from '@dedot/codecs';
import {
  ArchiveStorageResult,
  ArchiveStorageDiffItem,
  MethodResult,
  PaginatedStorageQuery,
} from '@dedot/types/json-rpc';
import { HexString } from '@dedot/utils';
import { IJsonRpcClient } from '../../types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';

/**
 * @name Archive
 * Archive JSON-RPC methods for accessing historical blockchain data.
 * Functions with the `archive` prefix allow obtaining the state of the chain
 * at any point in the present or in the past.
 *
 * JSON-RPC V2: https://paritytech.github.io/json-rpc-interface-spec/api/archive.html
 */
export class Archive extends JsonRpcGroup {
  #genesisHash?: HexString;
  #finalizedHeight?: number;
  #lastFinalizedCheck?: number;

  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'archive', supportedVersions: ['unstable', 'v1'], ...options });
  }

  /**
   * Retrieves the body (list of transactions) of a given block hash.
   * Returns an array of strings containing the hexadecimal-encoded SCALE-codec-encoded
   * transactions in that block. If no block with that hash is found, null.
   *
   * @param hash - The block hash
   * @returns Array of transaction hashes or null if block not found
   */
  async body(hash: BlockHash): Promise<Option<Array<HexString>>> {
    return this.send('body', hash);
  }

  /**
   * Get the chain's genesis hash.
   * Returns a string containing the hexadecimal-encoded hash of the genesis block of the chain.
   * This value is cached after the first call.
   *
   * @returns The genesis block hash
   */
  async genesisHash(): Promise<HexString> {
    if (!this.#genesisHash) {
      this.#genesisHash = await this.send('genesisHash');
    }
    return this.#genesisHash;
  }

  /**
   * Get the block's header.
   * Returns a string containing the hexadecimal-encoded SCALE-codec encoding header of the block.
   *
   * @param hash - The block hash
   * @returns The encoded block header or null if block not found
   */
  async header(hash: BlockHash): Promise<Option<HexString>> {
    return this.send('header', hash);
  }

  /**
   * Get the height of the current finalized block.
   * Returns an integer height of the current finalized block of the chain.
   * This value is cached for a short period to reduce RPC calls.
   *
   * @returns The height of the finalized block
   */
  async finalizedHeight(): Promise<number> {
    const now = Date.now();
    // Cache finalized height for 2 seconds to reduce RPC calls
    if (!this.#finalizedHeight || !this.#lastFinalizedCheck || now - this.#lastFinalizedCheck > 2000) {
      this.#finalizedHeight = await this.send('finalizedHeight');
      this.#lastFinalizedCheck = now;
    }
    return this.#finalizedHeight;
  }

  /**
   * Get the hashes of blocks from the given height.
   * Returns an array (possibly empty) of strings containing hexadecimal-encoded hashes of block headers.
   * 
   * Note: For heights <= finalized height, there is guaranteed to be one block.
   * For heights > finalized height, there may be zero, one or multiple blocks depending on forks.
   *
   * @param height - The block height
   * @returns Array of block hashes at the given height
   */
  async hashByHeight(height: number): Promise<Array<HexString>> {
    return this.send('hashByHeight', height);
  }

  /**
   * Call into the Runtime API at a specified block's state.
   *
   * @param hash - The block hash
   * @param func - The runtime API function to call
   * @param params - The parameters for the function call (SCALE-encoded)
   * @returns The result of the runtime call
   */
  async call(hash: BlockHash, func: string, params: HexString): Promise<MethodResult> {
    return this.send('call', hash, func, params);
  }

  /**
   * Returns storage entries at a specific block's state.
   * Supports pagination for large result sets.
   *
   * @param hash - The block hash
   * @param items - Array of storage queries with optional pagination
   * @param childTrie - Optional child trie key
   * @returns Storage results with potential discarded items count
   */
  async storage(
    hash: BlockHash,
    items: Array<PaginatedStorageQuery>,
    childTrie?: Option<HexString>,
  ): Promise<ArchiveStorageResult> {
    return this.send('storage', hash, items, childTrie ?? null);
  }

  /**
   * Returns the storage difference between two blocks.
   * This is a subscription-based method that returns an operation ID.
   *
   * @param hash - The block hash to get storage at
   * @param items - Array of storage diff items to query
   * @param previousHash - Optional previous block hash for comparison
   * @param childTrie - Optional child trie key
   * @returns Operation ID for the storage diff subscription
   */
  async storageDiff(
    hash: BlockHash,
    items: Array<ArchiveStorageDiffItem>,
    previousHash?: Option<BlockHash>,
    childTrie?: Option<HexString>,
  ): Promise<string> {
    return this.send('storageDiff', hash, items, previousHash ?? null, childTrie ?? null);
  }

  /**
   * Stop an ongoing storage operation.
   *
   * @param operationId - The operation ID to stop
   */
  async stopStorage(operationId: string): Promise<void> {
    return this.send('stopStorage', operationId);
  }

  /**
   * Stop an ongoing storage diff operation.
   *
   * @param operationId - The operation ID to stop
   */
  async stopStorageDiff(operationId: string): Promise<void> {
    return this.send('stopStorageDiff', operationId);
  }
}