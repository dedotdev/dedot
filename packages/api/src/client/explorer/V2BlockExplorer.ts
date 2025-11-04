import { $Header, BlockHash, Header } from '@dedot/codecs';
import type { Callback } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import type { Archive, ChainHead, PinnedBlock } from '../../json-rpc/index.js';
import type { BlockExplorer, BlockInfo } from '../../types.js';
import type { V2Client } from '../V2Client.js';

/**
 * @name V2BlockExplorer
 * @description Block explorer implementation for V2Client using JSON-RPC v2 (ChainHead API)
 */
export class V2BlockExplorer implements BlockExplorer {
  readonly #chainHead: ChainHead;
  readonly #archive?: Archive;

  constructor(client: V2Client<any>) {
    this.#chainHead = client.chainHead;
    this.#archive = client.archive;
  }

  /**
   * Convert PinnedBlock to BlockInfo format
   */
  private toBlockInfo(block: PinnedBlock): BlockInfo {
    return {
      hash: block.hash,
      number: block.number,
      parent: block.parent,
    };
  }

  /**
   * Convert block number to block hash
   * First checks pinned blocks via ChainHead, then falls back to Archive if available
   */
  private async toBlockHash(numberOrHash: number | BlockHash): Promise<BlockHash> {
    // If already a hash, return it
    if (typeof numberOrHash === 'string') {
      return numberOrHash;
    }

    // Try to find in pinned blocks first using ChainHead.findBlock
    const pinnedBlock = this.#chainHead.findBlock(numberOrHash);
    if (pinnedBlock) {
      return pinnedBlock.hash;
    }

    // Fall back to Archive if available
    if (this.#archive && (await this.#archive.supported())) {
      const hashes = await this.#archive.hashByHeight(numberOrHash);
      assert(hashes.length > 0, `No block found at height ${numberOrHash}`);
      return hashes[0];
    }

    throw new Error(`Block number ${numberOrHash} not found in pinned blocks and Archive is not supported`);
  }

  /**
   * Get the best block
   */
  best(): Promise<BlockInfo>;
  /**
   * Subscribe to the best block
   */
  best(callback: Callback<BlockInfo>): () => void;
  best(callback?: Callback<BlockInfo>): Promise<BlockInfo> | (() => void) {
    if (callback) {
      // Subscribe mode
      const handler = (block: PinnedBlock) => {
        callback(this.toBlockInfo(block));
      };

      this.#chainHead.bestBlock().then((block) => {
        handler(block);
      });

      return this.#chainHead.on('bestBlock', handler);
    } else {
      // One-time query
      return this.#chainHead.bestBlock().then((block) => this.toBlockInfo(block));
    }
  }

  /**
   * Get the finalized block
   */
  finalized(): Promise<BlockInfo>;
  /**
   * Subscribe to the finalized block
   */
  finalized(callback: Callback<BlockInfo>): () => void;
  finalized(callback?: Callback<BlockInfo>): Promise<BlockInfo> | (() => void) {
    if (callback) {
      // Subscribe mode
      const handler = (block: PinnedBlock) => {
        callback(this.toBlockInfo(block));
      };

      this.#chainHead.finalizedBlock().then((block) => {
        handler(block);
      });

      return this.#chainHead.on('finalizedBlock', handler);
    } else {
      return this.#chainHead.finalizedBlock().then((block) => this.toBlockInfo(block));
    }
  }

  /**
   * Get the header of a block by number or hash
   */
  async header(numberOrHash: number | BlockHash): Promise<Header> {
    const hash = await this.toBlockHash(numberOrHash);
    const rawHeader = await this.#chainHead.header(hash);

    assert(rawHeader, `Header not found for block ${numberOrHash}`);

    return $Header.tryDecode(rawHeader);
  }

  /**
   * Get the body (transactions) of a block by number or hash
   */
  async body(numberOrHash: number | BlockHash): Promise<HexString[]> {
    const hash = await this.toBlockHash(numberOrHash);
    return await this.#chainHead.body(hash);
  }
}
