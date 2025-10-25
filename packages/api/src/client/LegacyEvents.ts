import { $Header, Header } from '@dedot/codecs';
import { Unsub } from '@dedot/types';
import { EventEmitter, noop } from '@dedot/utils';
import { ChainHeadEvent, PinnedBlock } from '../json-rpc/index.js';
import type { IGenericSubstrateClient } from '../types.js';

/**
 * @name LegacyEvents
 * @description Manages block events (bestBlock, finalizedBlock) for LegacyClient using legacy RPC subscriptions
 *
 * This class encapsulates the subscription logic for best and finalized blocks in the legacy JSON-RPC environment.
 * It subscribes to `chain_subscribeNewHeads` and `chain_subscribeFinalizedHeads` and emits events when blocks are updated.
 *
 * Key features:
 * - Supports event handlers registered both before and after client is ready
 * - Tracks handler counts to manage RPC subscription lifecycle
 * - Automatically emits current block to new handlers if available
 */
export class LegacyEvents extends EventEmitter<ChainHeadEvent> {
  #bestBlockUnsub?: Unsub;
  #finalizedBlockUnsub?: Unsub;
  #bestBlock?: PinnedBlock;
  #finalizedBlock?: PinnedBlock;
  #client: IGenericSubstrateClient;
  #bestBlockHandlerCount: number = 0;
  #finalizedBlockHandlerCount: number = 0;
  #isReady: boolean = false;
  #bestBlockSubscribing: boolean = false;
  #finalizedBlockSubscribing: boolean = false;

  constructor(client: IGenericSubstrateClient) {
    super();
    this.#client = client;
  }

  /**
   * Mark the events handler as ready and trigger any pending subscriptions
   */
  setReady(): void {
    this.#isReady = true;

    // Trigger subscriptions if there were any registered before ready
    if (this.#bestBlockHandlerCount > 0 && !this.#bestBlockUnsub && !this.#bestBlockSubscribing) {
      this.#doSubscribeBestBlock().catch(console.error);
    }

    if (this.#finalizedBlockHandlerCount > 0 && !this.#finalizedBlockUnsub && !this.#finalizedBlockSubscribing) {
      this.#doSubscribeFinalizedBlock().catch(console.error);
    }
  }

  /**
   * Register a new bestBlock event handler
   * Increments the handler count and starts RPC subscription if ready
   */
  registerBestBlockHandler(): void {
    this.#bestBlockHandlerCount++;

    // If ready, subscribe to RPC (if not already subscribed or subscribing)
    if (this.#isReady && !this.#bestBlockUnsub && !this.#bestBlockSubscribing) {
      this.#doSubscribeBestBlock().catch(console.error);
    }

    // If already subscribed and have current block, emit it immediately
    if (this.#bestBlockUnsub && this.#bestBlock) {
      this.emit('bestBlock', this.#bestBlock, false);
    }
  }

  /**
   * Register a new finalizedBlock event handler
   * Increments the handler count and starts RPC subscription if ready
   */
  registerFinalizedBlockHandler(): void {
    this.#finalizedBlockHandlerCount++;

    // If ready, subscribe to RPC (if not already subscribed or subscribing)
    if (this.#isReady && !this.#finalizedBlockUnsub && !this.#finalizedBlockSubscribing) {
      this.#doSubscribeFinalizedBlock().catch(console.error);
    }

    // If already subscribed and have current block, emit it immediately
    if (this.#finalizedBlockUnsub && this.#finalizedBlock) {
      this.emit('finalizedBlock', this.#finalizedBlock);
    }
  }

  /**
   * Unregister a bestBlock event handler
   * Decrements the handler count and stops RPC subscription if count reaches 0
   */
  unregisterBestBlockHandler(): void {
    this.#bestBlockHandlerCount = Math.max(0, this.#bestBlockHandlerCount - 1);

    // Unsubscribe if no more handlers
    if (this.#bestBlockHandlerCount === 0) {
      this.#unsubscribeBestBlock().catch(noop);
    }
  }

  /**
   * Unregister a finalizedBlock event handler
   * Decrements the handler count and stops RPC subscription if count reaches 0
   */
  unregisterFinalizedBlockHandler(): void {
    this.#finalizedBlockHandlerCount = Math.max(0, this.#finalizedBlockHandlerCount - 1);

    // Unsubscribe if no more handlers
    if (this.#finalizedBlockHandlerCount === 0) {
      this.#unsubscribeFinalizedBlock().catch(noop);
    }
  }

  /**
   * Subscribe to best block updates via chain_subscribeNewHeads
   * @private
   */
  async #doSubscribeBestBlock(): Promise<void> {
    if (this.#bestBlockUnsub || this.#bestBlockSubscribing) {
      return; // Already subscribed or subscribing
    }

    this.#bestBlockSubscribing = true;

    try {
      this.#bestBlockUnsub = await this.#client.rpc.chain_subscribeNewHeads((header: Header) => {
        const hash = this.#client.registry.hashAsHex($Header.tryEncode(header));
        const block: PinnedBlock = {
          hash,
          number: header.number,
          parent: header.parentHash,
        };

        this.#bestBlock = block;
        this.emit('bestBlock', block, false); // bestChainChanged is always false for legacy
      });
    } catch (error) {
      console.error('Failed to subscribe to new heads:', error);
      throw error;
    } finally {
      this.#bestBlockSubscribing = false;
    }
  }

  /**
   * Subscribe to finalized block updates via chain_subscribeFinalizedHeads
   * @private
   */
  async #doSubscribeFinalizedBlock(): Promise<void> {
    if (this.#finalizedBlockUnsub || this.#finalizedBlockSubscribing) {
      return; // Already subscribed or subscribing
    }

    this.#finalizedBlockSubscribing = true;

    try {
      this.#finalizedBlockUnsub = await this.#client.rpc.chain_subscribeFinalizedHeads((header: Header) => {
        const hash = this.#client.registry.hashAsHex($Header.tryEncode(header));
        const block: PinnedBlock = {
          hash,
          number: header.number,
          parent: header.parentHash,
        };

        this.#finalizedBlock = block;
        this.emit('finalizedBlock', block);
      });
    } catch (error) {
      console.error('Failed to subscribe to finalized heads:', error);
      throw error;
    } finally {
      this.#finalizedBlockSubscribing = false;
    }
  }

  /**
   * Unsubscribe from best block updates
   * @private
   */
  async #unsubscribeBestBlock(): Promise<void> {
    if (!this.#bestBlockUnsub) {
      return;
    }

    try {
      await this.#bestBlockUnsub();
      this.#bestBlockUnsub = undefined;
      this.#bestBlock = undefined;
    } catch (error) {
      console.error('Failed to unsubscribe from new heads:', error);
    }
  }

  /**
   * Unsubscribe from finalized block updates
   * @private
   */
  async #unsubscribeFinalizedBlock(): Promise<void> {
    if (!this.#finalizedBlockUnsub) {
      return;
    }

    try {
      await this.#finalizedBlockUnsub();
      this.#finalizedBlockUnsub = undefined;
      this.#finalizedBlock = undefined;
    } catch (error) {
      console.error('Failed to unsubscribe from finalized heads:', error);
    }
  }

  /**
   * Get the current best block
   */
  bestBlock(): PinnedBlock | undefined {
    return this.#bestBlock;
  }

  /**
   * Get the current finalized block
   */
  finalizedBlock(): PinnedBlock | undefined {
    return this.#finalizedBlock;
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    this.#bestBlockHandlerCount = 0;
    this.#finalizedBlockHandlerCount = 0;
    this.#isReady = false;
    this.#bestBlockSubscribing = false;
    this.#finalizedBlockSubscribing = false;
    await this.#unsubscribeBestBlock();
    await this.#unsubscribeFinalizedBlock();

    this.off('bestBlock');
    this.off('finalizedBlock');
  }
}
