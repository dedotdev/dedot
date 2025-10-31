import { $Header, BlockHash, Header } from '@dedot/codecs';
import type { Callback, Unsub } from '@dedot/types';
import { assert, HexString } from '@dedot/utils';
import type { BlockExplorer, BlockInfo } from '../../types.js';
import type { LegacyClient } from '../LegacyClient.js';

/**
 * @name LegacyBlockExplorer
 * @description Block explorer implementation for LegacyClient using legacy JSON-RPC methods
 */
export class LegacyBlockExplorer implements BlockExplorer {
  readonly #client: LegacyClient<any>;

  constructor(client: LegacyClient<any>) {
    this.#client = client;
  }

  /**
   * Convert block number to block hash using legacy RPC
   */
  private async toBlockHash(numberOrHash: number | BlockHash): Promise<BlockHash> {
    // If already a hash, return it
    if (typeof numberOrHash === 'string') {
      return numberOrHash;
    }

    // Use legacy RPC to get block hash by number
    const hash = await this.#client.rpc.chain_getBlockHash(numberOrHash);
    assert(hash, `No block found at height ${numberOrHash}`);
    return hash;
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
      // Subscribe mode using chain_subscribeNewHeads
      return this.#client.rpc.chain_subscribeNewHeads(async (header: Header) => {
        const blockInfo: BlockInfo = {
          hash: await this.#client.rpc.chain_getBlockHash(header.number),
          number: header.number,
          parent: header.parentHash,
        };
        callback(blockInfo);
      });
    } else {
      // One-time query using chain_getHeader
      return this.#client.rpc.chain_getHeader().then(async (header: Header | undefined) => {
        assert(header, 'Header not found');
        return {
          hash: await this.#client.rpc.chain_getBlockHash(header.number),
          number: header.number,
          parent: header.parentHash,
        };
      });
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
      // Subscribe mode using chain_subscribeFinalizedHeads
      return this.#client.rpc.chain_subscribeFinalizedHeads(async (header: Header) => {
        const blockInfo: BlockInfo = {
          hash: await this.#client.rpc.chain_getBlockHash(header.number),
          number: header.number,
          parent: header.parentHash,
        };
        callback(blockInfo);
      });
    } else {
      // One-time query using chain_getFinalizedHead
      return this.#client.rpc.chain_getFinalizedHead().then(async (hash: BlockHash) => {
        const header = await this.#client.rpc.chain_getHeader(hash);
        assert(header, 'Finalized header not found');
        return {
          hash,
          number: header.number,
          parent: header.parentHash,
        };
      });
    }
  }

  /**
   * Walk backwards from best block to finalized block through parent chain
   */
  private async calculateBests(): Promise<BlockInfo[]> {
    const [bestHeader, finalizedHash] = await Promise.all([
      this.#client.rpc.chain_getHeader(),
      this.#client.rpc.chain_getFinalizedHead(),
    ]);

    assert(bestHeader, 'Best header not found');

    const finalizedHeader = await this.#client.rpc.chain_getHeader(finalizedHash);
    assert(finalizedHeader, 'Finalized header not found');

    const blocks: BlockInfo[] = [];
    let currentHash = await this.#client.rpc.chain_getBlockHash(bestHeader.number);
    let currentHeader = bestHeader;

    // Walk backwards from best to finalized
    while (currentHeader && currentHash !== finalizedHash) {
      blocks.push({
        hash: currentHash,
        number: currentHeader.number,
        parent: currentHeader.parentHash,
      });

      currentHash = currentHeader.parentHash;
      currentHeader = await this.#client.rpc.chain_getHeader(currentHash);
      if (!currentHeader) break;
    }

    // Add the finalized block
    blocks.push({
      hash: finalizedHash,
      number: finalizedHeader.number,
      parent: finalizedHeader.parentHash,
    });

    return blocks;
  }

  /**
   * Get the list of best blocks (from current best to finalized)
   */
  bests(): Promise<BlockInfo[]>;
  /**
   * Subscribe to the list of best blocks
   */
  bests(callback: Callback<BlockInfo[]>): () => void;
  bests(callback?: Callback<BlockInfo[]>): Promise<BlockInfo[]> | (() => void) {
    if (callback) {
      // Subscribe mode - recalculate on any best or finalized block change
      const unsubBest = this.#client.rpc.chain_subscribeNewHeads(async () => {
        const blocks = await this.calculateBests();
        callback(blocks);
      });

      const unsubFinalized = this.#client.rpc.chain_subscribeFinalizedHeads(async () => {
        const blocks = await this.calculateBests();
        callback(blocks);
      });

      return () => {
        unsubBest.then((unsub: Unsub) => unsub());
        unsubFinalized.then((unsub: Unsub) => unsub());
      };
    } else {
      // One-time query
      return this.calculateBests();
    }
  }

  /**
   * Get the header of a block by number or hash
   */
  async header(numberOrHash: number | BlockHash): Promise<Header> {
    const hash = await this.toBlockHash(numberOrHash);
    const header = await this.#client.rpc.chain_getHeader(hash);

    assert(header, `Header not found for block ${numberOrHash}`);

    return header;
  }

  /**
   * Get the body (transactions) of a block by number or hash
   */
  async body(numberOrHash: number | BlockHash): Promise<HexString[]> {
    const hash = await this.toBlockHash(numberOrHash);
    const block = await this.#client.rpc.chain_getBlock(hash);

    assert(block, `Block not found for ${numberOrHash}`);

    return block.block.extrinsics;
  }
}

