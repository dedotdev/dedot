import { $Header, BlockHash, Header } from '@dedot/codecs';
import type { Callback, Unsub } from '@dedot/types';
import { assert, AsyncQueue, HexString } from '@dedot/utils';
import type { BlockExplorer, BlockInfo } from '../../types.js';
import type { LegacyClient } from '../LegacyClient.js';

/**
 * Simple Subject implementation inspired by RxJS BehaviorSubject
 * - Stores current value
 * - Emits current value immediately to new subscribers
 * - Tracks listener count for cleanup
 */
class Subject<T> {
  #value?: T;
  #listeners: Set<Callback<T>>;

  constructor(initialValue?: T) {
    this.#value = initialValue;
    this.#listeners = new Set();
  }

  /**
   * Emit a new value to all subscribers
   */
  next(value: T): void {
    this.#value = value;
    this.#listeners.forEach((listener) => {
      try {
        listener(value);
      } catch (error) {
        // Swallow errors to prevent one listener from breaking others
        console.error('Error in Subject listener:', error);
      }
    });
  }

  /**
   * Subscribe to value changes
   * Immediately emits the current value if available
   */
  subscribe(callback: Callback<T>): () => void {
    // Immediately emit current value to new subscriber
    if (this.#value !== undefined) {
      try {
        callback(this.#value);
      } catch (error) {
        console.error('Error in Subject subscriber callback:', error);
      }
    }

    this.#listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.#listeners.delete(callback);
    };
  }

  /**
   * Get the number of active listeners
   */
  get listenerCount(): number {
    return this.#listeners.size;
  }

  /**
   * Get the current value
   */
  get value(): T | undefined {
    return this.#value;
  }
}

/**
 * @name LegacyBlockExplorer
 * @description Block explorer implementation for LegacyClient using legacy JSON-RPC methods
 * Optimized to share RPC subscriptions across multiple subscribers using Subject pattern
 */
export class LegacyBlockExplorer implements BlockExplorer {
  readonly #client: LegacyClient<any>;

  // Subjects for block subscriptions
  readonly #bestBlockSubject: Subject<BlockInfo>;
  readonly #finalizedBlockSubject: Subject<BlockInfo>;

  // Track RPC subscription cleanup functions
  #bestBlockUnsub?: () => void;
  #finalizedBlockUnsub?: () => void;

  constructor(client: LegacyClient<any>) {
    this.#client = client;
    this.#bestBlockSubject = new Subject<BlockInfo>();
    this.#finalizedBlockSubject = new Subject<BlockInfo>();
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

    // Start RPC subscription (non-blocking)
    this.#client.rpc
      .chain_subscribeNewHeads((header: Header) => {
        if (done) {
          // Unsubscribe was called before subscription completed
          unsub && unsub();
          return;
        }

        const blockInfo: BlockInfo = {
          hash: this.calculateBlockHash(header),
          number: header.number,
          parent: header.parentHash,
        };
        this.#bestBlockSubject.next(blockInfo);
      })
      .then((rpcUnsub: any) => {
        unsub = rpcUnsub;
      });

    // Immediately set unsub wrapper to prevent race conditions
    this.#bestBlockUnsub = () => {
      done = true;
      unsub && unsub();
    };
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
            const lastNumber = this.#finalizedBlockSubject.value?.number;
            if (lastNumber === header.number) {
              return;
            }

            if (lastNumber !== undefined && header.number > lastNumber + 1) {
              // Gap detected - backfill missing blocks
              const gapSize = header.number - lastNumber - 1;
              console.warn(
                `Finalized block gap detected: ${gapSize} blocks missing (${lastNumber + 1} to ${header.number - 1})`,
              );

              // Create list of missing block numbers
              const missingNums = Array.from({ length: gapSize }, (_, i) => lastNumber + 1 + i);

              try {
                // Fetch all hashes in parallel
                const hashes = await Promise.all(
                  missingNums.map((num) => this.#client.rpc.chain_getBlockHash(num) as HexString),
                );

                // Fetch all headers in parallel
                const headers = await Promise.all(
                  hashes.map((hash) => this.#client.rpc.chain_getHeader(hash) as Header),
                );

                // Emit blocks in order
                for (let i = 0; i < missingNums.length; i++) {
                  const hash = hashes[i];
                  const header = headers[i];

                  if (hash && header) {
                    const missingBlockInfo: BlockInfo = {
                      hash,
                      number: header.number,
                      parent: header.parentHash,
                    };
                    this.#finalizedBlockSubject.next(missingBlockInfo);
                  }
                }
              } catch (error) {
                console.error('Failed to backfill missing finalized blocks:', error);
                // Continue with current block despite backfill failure
              }
            }

            // Emit current block
            const blockInfo: BlockInfo = {
              hash: this.calculateBlockHash(header),
              number: header.number,
              parent: header.parentHash,
            };
            this.#finalizedBlockSubject.next(blockInfo);
          })
          .catch((error) => {
            console.error('Error processing finalized block:', error);
          });
      })
      .then((rpcUnsub: any) => {
        unsub = rpcUnsub;
      });

    // Immediately set unsub wrapper to prevent race conditions
    this.#finalizedBlockUnsub = () => {
      done = true;
      blockQueue.cancel();
      unsub && unsub();
    };
  }

  /**
   * Clean up best block subscription when no more listeners
   */
  private cleanupBestBlockSubscription(): void {
    if (this.#bestBlockSubject.listenerCount === 0 && this.#bestBlockUnsub) {
      this.#bestBlockUnsub();
      this.#bestBlockUnsub = undefined;
    }
  }

  /**
   * Clean up finalized block subscription when no more listeners
   */
  private cleanupFinalizedBlockSubscription(): void {
    if (this.#finalizedBlockSubject.listenerCount === 0 && this.#finalizedBlockUnsub) {
      this.#finalizedBlockUnsub();
      this.#finalizedBlockUnsub = undefined;
    }
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
   * Multiple subscribers will share a single RPC subscription
   * New subscribers immediately receive the current best block if available
   */
  best(callback: Callback<BlockInfo>): () => void;
  best(callback?: Callback<BlockInfo>): Promise<BlockInfo> | (() => void) {
    if (callback) {
      // Subscribe mode - use shared subscription
      // Ensure RPC subscription is active (creates on first listener)
      this.ensureBestBlockSubscription();

      // Subscribe to subject (automatically emits current value if available)
      const unsub = this.#bestBlockSubject.subscribe(callback);

      // Return cleanup function
      return () => {
        unsub();
        this.cleanupBestBlockSubscription();
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
   * Multiple subscribers will share a single RPC subscription
   * New subscribers immediately receive the current finalized block if available
   */
  finalized(callback: Callback<BlockInfo>): () => void;
  finalized(callback?: Callback<BlockInfo>): Promise<BlockInfo> | (() => void) {
    if (callback) {
      // Subscribe mode - use shared subscription
      // Ensure RPC subscription is active (creates on first listener)
      this.ensureFinalizedBlockSubscription();

      // Subscribe to subject (automatically emits current value if available)
      const unsub = this.#finalizedBlockSubject.subscribe(callback);

      // Return cleanup function
      return () => {
        unsub();
        this.cleanupFinalizedBlockSubscription();
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
