import { BlockHash } from '@dedot/codecs';

/**
 * A helper to track block hash usage
 */
export class BlockUsage {
  #usages: Record<BlockHash, number> = {};

  use(blockHash: BlockHash) {
    this.#usages[blockHash] = (this.#usages[blockHash] || 0) + 1;
  }

  release(blockHash: BlockHash) {
    if (!this.#usages[blockHash]) return;

    this.#usages[blockHash] -= 1;
  }

  usage(blockHash: BlockHash): number {
    return this.#usages[blockHash] || 0;
  }

  clear() {
    this.#usages = {};
  }
}
