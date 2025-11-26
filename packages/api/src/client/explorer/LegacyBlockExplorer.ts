import { $Header, BlockHash, Header } from '@dedot/codecs';
import { Unsub } from '@dedot/types';
import { assert, AsyncQueue, HexString, noop, Signal } from '@dedot/utils';
import type { BlockExplorer, BlockInfo } from '../../types.js';
import type { LegacyClient } from '../LegacyClient.js';

/**
 * @name LegacyBlockExplorer
 * @description Block explorer implementation for LegacyClient using legacy JSON-RPC methods
 * Optimized to share RPC subscriptions across multiple subscribers using Signal pattern
 */
export class LegacyBlockExplorer implements BlockExplorer {
  readonly #client: LegacyClient<any>;

  // Signals for block subscriptions
  readonly #bestBlockSignal: Signal<BlockInfo>;
  readonly #finalizedBlockSignal: Signal<BlockInfo>;

  // Track RPC subscription cleanup functions
  #bestBlockUnsub?: () => void;
  #finalizedBlockUnsub?: () => void;

  constructor(client: LegacyClient<any>) {
    this.#client = client;
    this.#bestBlockSignal = new Signal<BlockInfo>();
    this.#finalizedBlockSignal = new Signal<BlockInfo>();
  }

  /**
   * Convert PinnedBlock to BlockInfo format
   */
  private toBlockInfo(header: Header & { hash?: BlockHash }): BlockInfo {
    return {
      hash: header.hash || this.calculateBlockHash(header),
      number: header.number,
      parent: header.parentHash,
      runtimeUpgraded: this.hasNewRuntime(header),
    };
  }

  /**
   * Fill missing blocks when a gap is detected
   * Fetches and emits all missing blocks between lastNumber and currentNumber
   */
  private async fillMissingBlocks(
    lastNumber: number | undefined,
    currentNumber: number,
    subject: Signal<BlockInfo>,
    blockType: 'best' | 'finalized',
  ): Promise<void> {
    // No gap if no previous block or current is next sequential block
    if (lastNumber === undefined || currentNumber <= lastNumber + 1) {
      return;
    }

    // Gap detected - backfill missing blocks
    const gapSize = currentNumber - lastNumber - 1;

    // Create list of missing block numbers
    const missingNums = Array.from({ length: gapSize }, (_, i) => lastNumber + 1 + i);

    try {
      // Fetch all hashes in parallel
      const hashes = await Promise.all(missingNums.map((num) => this.#client.rpc.chain_getBlockHash(num) as HexString));

      // Fetch all headers in parallel
      const headers = await Promise.all(hashes.map((hash) => this.#client.rpc.chain_getHeader(hash) as Header));

      // Emit blocks in order
      for (let i = 0; i < missingNums.length; i++) {
        const hash = hashes[i];
        const header = headers[i];

        if (hash && header) {
          subject.next(this.toBlockInfo({ ...header, hash }));
        }
      }
    } catch (error) {
      console.error(`Failed to backfill missing ${blockType} blocks:`, error);
      // Continue despite backfill failure
    }
  }

  /**
   * Start the shared best block subscription if not already active
   */
  private ensureBestBlockSubscription(): void {
    if (this.#bestBlockUnsub) {
      // Subscription already active
      return;
    }

    // Use closure pattern to handle async subscription without race conditions
    let done = false;
    let unsub: Unsub | undefined;
    const blockQueue = new AsyncQueue();

    // Start RPC subscription (non-blocking)
    this.#client.rpc
      .chain_subscribeNewHeads((header: Header) => {
        if (done) {
          // Unsubscribe was called before subscription completed
          unsub && unsub();
          return;
        }

        // Enqueue block processing to ensure sequential handling
        blockQueue
          .enqueue(async () => {
            const currentHash = this.calculateBlockHash(header);
            // Detect gaps in best block stream (due to reconnection)
            const { number: lastNumber, hash: lastHash } = this.#bestBlockSignal.value || {};
            if (lastHash === currentHash) {
              return;
            }

            // Fill missing blocks if gap detected
            await this.fillMissingBlocks(lastNumber, header.number, this.#bestBlockSignal, 'best');

            // Emit current block
            const blockInfo: BlockInfo = this.toBlockInfo({ ...header, hash: currentHash });
            this.#bestBlockSignal.next(blockInfo);
          })
          .catch((error) => {
            console.error('Error processing best block:', error);
          });
      })
      .then((rpcUnsub: Unsub) => {
        unsub = rpcUnsub;
      });

    // Immediately set unsub wrapper to prevent race conditions
    this.#bestBlockUnsub = () => {
      done = true;
      blockQueue.cancel();
      unsub && unsub().catch(noop);
    };
  }

  private hasNewRuntime(header: Header): boolean {
    return header.digest.logs.some((log) => log.type === 'RuntimeEnvironmentUpdated');
  }

  /**
   * Start the shared finalized block subscription if not already active
   */
  private ensureFinalizedBlockSubscription(): void {
    if (this.#finalizedBlockUnsub) {
      // Subscription already active
      return;
    }

    // Use closure pattern to handle async subscription without race conditions
    let done = false;
    let unsub: Unsub | undefined;
    const blockQueue = new AsyncQueue();

    // Start RPC subscription (non-blocking)
    this.#client.rpc
      .chain_subscribeFinalizedHeads((header: Header) => {
        if (done) {
          // Unsubscribe was called before subscription completed
          unsub && unsub();
          return;
        }

        // Enqueue block processing to ensure sequential handling
        blockQueue
          .enqueue(async () => {
            // Detect gaps in finalized block stream (due to reconnection)
            const lastNumber = this.#finalizedBlockSignal.value?.number;
            if (lastNumber === header.number) {
              return;
            }

            // Fill missing blocks if gap detected
            await this.fillMissingBlocks(lastNumber, header.number, this.#finalizedBlockSignal, 'finalized');

            // Emit current block
            const blockInfo: BlockInfo = this.toBlockInfo(header);
            this.#finalizedBlockSignal.next(blockInfo);
          })
          .catch((error) => {
            console.error('Error processing finalized block:', error);
          });
      })
      .then((rpcUnsub: Unsub) => {
        unsub = rpcUnsub;
      });

    // Immediately set unsub wrapper to prevent race conditions
    this.#finalizedBlockUnsub = () => {
      done = true;
      blockQueue.cancel();
      unsub && unsub().catch(noop);
    };
  }

  /**
   * Clean up best block subscription when no more listeners
   */
  private cleanupBestBlockSubscription(): void {
    if (this.#bestBlockSignal.listenerCount === 0 && this.#bestBlockUnsub) {
      this.#bestBlockUnsub();
      this.#bestBlockUnsub = undefined;
    }
  }

  /**
   * Clean up finalized block subscription when no more listeners
   */
  private cleanupFinalizedBlockSubscription(): void {
    if (this.#finalizedBlockSignal.listenerCount === 0 && this.#finalizedBlockUnsub) {
      this.#finalizedBlockUnsub();
      this.#finalizedBlockUnsub = undefined;
    }
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
   * Multiple subscribers will share a single RPC subscription
   * New subscribers immediately receive the current best block if available
   */
  best(callback: (block: BlockInfo) => void): () => void;
  best(callback?: (block: BlockInfo) => void): Promise<BlockInfo> | (() => void) {
    if (callback) {
      // Subscribe mode - use shared subscription
      // Ensure RPC subscription is active (creates on first listener)
      this.ensureBestBlockSubscription();

      // Subscribe to subject (automatically emits current value if available)
      const unsub = this.#bestBlockSignal.subscribe(callback);

      // Return cleanup function
      return () => {
        unsub();
        this.cleanupBestBlockSubscription();
      };
    } else {
      // One-time query - return cached value if available
      if (this.#bestBlockSignal.value) {
        return Promise.resolve(this.#bestBlockSignal.value);
      }

      // Fallback to RPC call if no cached value
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
   * Multiple subscribers will share a single RPC subscription
   * New subscribers immediately receive the current finalized block if available
   */
  finalized(callback: (block: BlockInfo) => void): () => void;
  finalized(callback?: (block: BlockInfo) => void): Promise<BlockInfo> | (() => void) {
    if (callback) {
      // Subscribe mode - use shared subscription
      // Ensure RPC subscription is active (creates on first listener)
      this.ensureFinalizedBlockSubscription();

      // Subscribe to subject (automatically emits current value if available)
      const unsub = this.#finalizedBlockSignal.subscribe(callback);

      // Return cleanup function
      return () => {
        unsub();
        this.cleanupFinalizedBlockSubscription();
      };
    } else {
      // One-time query - return cached value if available
      if (this.#finalizedBlockSignal.value) {
        return Promise.resolve(this.#finalizedBlockSignal.value);
      }

      // Fallback to RPC call if no cached value
      return this.#client.rpc.chain_getFinalizedHead().then(async (hash: BlockHash) => {
        const header = await this.header(hash);
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
  async header(hash: BlockHash): Promise<Header> {
    const header = await this.#client.rpc.chain_getHeader(hash);

    assert(header, `Header not found for block ${hash}`);

    return header;
  }

  /**
   * Get the body (transactions) of a block by number or hash
   */
  async body(hash: BlockHash): Promise<HexString[]> {
    const block = await this.#client.rpc.chain_getBlock(hash);

    assert(block, `Block not found for ${hash}`);

    return block.block.extrinsics;
  }
}
