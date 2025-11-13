import { $Header, BlockHash, Header } from '@dedot/codecs';
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
      runtimeUpgraded: block.runtimeUpgraded === true,
    };
  }

  /**
   * Get the best block
   */
  best(): Promise<BlockInfo>;
  /**
   * Subscribe to the best block
   */
  best(callback: (block: BlockInfo) => void): () => void;
  best(callback?: (block: BlockInfo) => void): Promise<BlockInfo> | (() => void) {
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
  finalized(callback: (block: BlockInfo) => void): () => void;
  finalized(callback?: (block: BlockInfo) => void): Promise<BlockInfo> | (() => void) {
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
  async header(hash: BlockHash): Promise<Header> {
    const rawHeader = await this.#chainHead.header(hash);

    assert(rawHeader, `Header not found for block ${hash}`);

    return $Header.tryDecode(rawHeader);
  }

  /**
   * Get the body (transactions) of a block by number or hash
   */
  async body(hash: BlockHash): Promise<HexString[]> {
    return await this.#chainHead.body(hash);
  }
}
