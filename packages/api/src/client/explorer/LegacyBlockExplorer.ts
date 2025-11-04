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

  private calculateBlockHash(header: Header): BlockHash {
    return this.#client.registry.hashAsHex($Header.tryEncode(header));
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
      let done = false;
      let unsub: () => void;

      this.#client.rpc
        .chain_subscribeNewHeads(async (header: Header) => {
          if (done) {
            unsub && unsub();
            return;
          }

          const blockInfo: BlockInfo = {
            hash: this.calculateBlockHash(header),
            number: header.number,
            parent: header.parentHash,
          };
          callback(blockInfo);
        })
        .then((x: any) => {
          unsub = x;
        });

      return () => {
        done = true;
        unsub && unsub();
      };
    } else {
      // One-time query using chain_getHeader
      return this.#client.rpc.chain_getHeader().then(async (header: Header | undefined) => {
        assert(header, 'Header not found');
        return {
          hash: this.calculateBlockHash(header),
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
      let done = false;
      let unsub: () => void;

      // Subscribe mode using chain_subscribeFinalizedHeads
      this.#client.rpc
        .chain_subscribeFinalizedHeads(async (header: Header) => {
          if (done) {
            unsub && unsub();
            return;
          }

          const blockInfo: BlockInfo = {
            hash: this.calculateBlockHash(header),
            number: header.number,
            parent: header.parentHash,
          };
          callback(blockInfo);
        })
        .then((x: any) => {
          unsub = x;
        });

      return () => {
        done = true;
        unsub && unsub();
      };
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
