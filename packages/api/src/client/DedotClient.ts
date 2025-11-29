import { type Extrinsic, Metadata, PortableRegistry } from '@dedot/codecs';
import { ConnectionStatus, JsonRpcProvider } from '@dedot/providers';
import {
  Callback,
  GenericStorageQuery,
  GenericSubstrateApi,
  InjectedSigner,
  Query,
  QueryFnResult,
  RpcVersion,
  TxUnsub,
  Unsub,
} from '@dedot/types';
import { HexString } from '@dedot/utils';
import { SubstrateApi } from '../chaintypes/index.js';
import { isJsonRpcProvider } from '../json-rpc/index.js';
import {
  ApiEvent,
  ApiOptions,
  BlockExplorer,
  ISubstrateClient,
  ISubstrateClientAt,
  SubstrateRuntimeVersion,
  IChainSpec,
  type EventHandlerFn,
} from '../types.js';
import { BaseSubstrateClient } from './BaseSubstrateClient.js';
import { LegacyClient } from './LegacyClient.js';
import { V2Client } from './V2Client.js';

/**
 * Configuration options for DedotClient
 */
export type ClientOptions = ApiOptions & {
  /**
   * The JSON-RPC version to use
   * - 'v2' (default): Uses the new JSON-RPC v2 specification
   * - 'legacy': Uses the legacy JSON-RPC specification for older nodes
   */
  rpcVersion?: RpcVersion;
};

/**
 * @name DedotClient
 * @description The main entry point for interacting with PolkadotSDK-based blockchains.
 *
 * DedotClient is a facade that provides a unified API for both JSON-RPC v2 (default) and legacy
 * JSON-RPC versions.
 *
 * @example
 * ```typescript
 * import { DedotClient, WsProvider } from 'dedot';
 * import type { PolkadotApi } from '@dedot/chaintypes/polkadot';
 *
 * // Create and connect to a Polkadot node
 * const provider = new WsProvider('wss://rpc.polkadot.io');
 * const client = await DedotClient.new<PolkadotApi>(provider);
 *
 * // Query on-chain storage
 * const balance = await client.query.system.account('14...');
 * console.log('Balance:', balance);
 *
 * // Subscribe to runtime upgrades
 * const unsub = client.on('runtimeUpgraded', (version, block) => {
 *   console.log('Runtime upgraded to:', version.specVersion, 'at block:', block.number);
 * });
 *
 * // Make transactions
 * const tx = client.tx.balances.transferKeepAlive('15...', 1000000000000n);
 *
 * // Disconnect when done
 * await client.disconnect();
 * ```
 *
 * @template ChainApi - Chain-specific API type for type-safe interactions (defaults to SubstrateApi)
 */
export class DedotClient<
  ChainApi extends GenericSubstrateApi = SubstrateApi, // --
> implements ISubstrateClient<ChainApi, ApiEvent>
{
  #client: ISubstrateClient<ChainApi, ApiEvent>;
  /** The JSON-RPC version being used ('v2' or 'legacy') */
  rpcVersion: RpcVersion;

  /**
   * Creates a new DedotClient instance.
   *
   * Use factory methods (`create`, `new`, `legacy`) for automatic connection.
   *
   * @param options - Client configuration options or a JsonRpcProvider instance
   */
  constructor(options: ClientOptions | JsonRpcProvider) {
    let rpcVersion: RpcVersion = 'v2';
    if (!isJsonRpcProvider(options)) {
      if (options['rpcVersion'] === 'legacy') {
        rpcVersion = 'legacy';
      }
    }

    this.rpcVersion = rpcVersion;

    if (this.rpcVersion === 'legacy') {
      this.#client = new LegacyClient(options);
    } else {
      this.#client = new V2Client(options);
    }
  }

  /**
   * Factory method to create and connect a new DedotClient instance.
   *
   * @param options - Client configuration options or a JsonRpcProvider instance
   * @returns A connected DedotClient instance
   *
   * @example
   * ```typescript
   * const client = await DedotClient.create<PolkadotApi>({
   *   provider: new WsProvider('wss://rpc.polkadot.io'),
   * });
   * ```
   */
  static async create<
    ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  >(options: ClientOptions | JsonRpcProvider): Promise<DedotClient<ChainApi>> {
    return new DedotClient<ChainApi>(options).connect();
  }

  /**
   * Alias for `DedotClient.create`
   *
   * @param options - Client configuration options or a JsonRpcProvider instance
   * @returns A connected DedotClient instance
   */
  static async new<
    ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  >(options: ClientOptions | JsonRpcProvider): Promise<DedotClient<ChainApi>> {
    return DedotClient.create<ChainApi>(options);
  }

  /**
   * Factory method to create a DedotClient using legacy JSON-RPC.
   *
   * This is a convenience method that automatically sets `rpcVersion: 'legacy'`.
   *
   * @param options - Client configuration options or a JsonRpcProvider instance
   * @returns A connected DedotClient instance using legacy JSON-RPC
   *
   * @example
   * ```typescript
   * const client = await DedotClient.legacy<PolkadotApi>({
   *   provider: new WsProvider('wss://rpc.polkadot.io'),
   * });
   * ```
   */
  static async legacy<
    ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  >(options: ClientOptions | JsonRpcProvider): Promise<DedotClient<ChainApi>> {
    return DedotClient.create<ChainApi>(
      isJsonRpcProvider(options) // --
        ? { provider: options, rpcVersion: 'legacy' }
        : { ...options, rpcVersion: 'legacy' },
    );
  }

  /** The API configuration options */
  get options(): ApiOptions {
    return this.#client.options;
  }

  /** Current connection status */
  get status(): ConnectionStatus {
    return this.#client.status;
  }

  /** The underlying JSON-RPC provider */
  get provider(): JsonRpcProvider {
    return this.#client.provider;
  }

  /** Transaction builder for submitting extrinsics */
  get tx(): ChainApi['tx'] {
    return this.#client.tx;
  }

  /** Raw JSON-RPC method access */
  get rpc(): ChainApi['rpc'] {
    return this.#client.rpc;
  }

  /** The genesis hash of the connected chain */
  get genesisHash(): HexString {
    return this.#client.genesisHash;
  }

  /** Current runtime version information */
  get runtimeVersion(): SubstrateRuntimeVersion {
    return this.#client.runtimeVersion;
  }

  /** The chain metadata */
  get metadata(): Metadata {
    return this.#client.metadata;
  }

  /** Type registry for encoding/decoding chain types */
  get registry(): PortableRegistry<ChainApi['types']> {
    return this.#client.registry;
  }

  /**
   * Access to pallet constants.
   *
   * @example
   * ```typescript
   * const existentialDeposit = client.consts.balances.existentialDeposit;
   * const ss58Prefix = client.consts.system.ss58Prefix;
   * ```
   */
  get consts(): ChainApi['consts'] {
    return this.#client.consts;
  }

  /**
   * Storage query interface for reading on-chain state.
   *
   * @example
   * ```typescript
   * // One-time query
   * const account = await client.query.system.account(address);
   *
   * // Subscribe to storage changes
   * const unsub = await client.query.system.number((blockNumber) => {
   *   console.log('Current block:', blockNumber);
   * });
   * ```
   */
  get query(): ChainApi['query'] {
    return this.#client.query;
  }

  /**
   * Runtime API call interface.
   *
   * @example
   * ```typescript
   * const rawMetadata = await client.call.metadata.metadataAtVersion(16);
   * const version = await client.call.core.version();
   * ```
   */
  get call(): ChainApi['call'] {
    return this.#client.call;
  }

  /**
   * Event type definitions and utilities.
   *
   * @example
   * ```typescript
   * // Check if an event matches a specific type
   * if (client.events.balances.Transfer.is(event)) {
   *   console.log('Transfer event:', event.data);
   * }
   * ```
   */
  get events(): ChainApi['events'] {
    return this.#client.events;
  }

  /**
   * Error type definitions and utilities.
   *
   * @example
   * ```typescript
   * // Check if an error matches a specific type
   * if (client.errors.balances.InsufficientBalance.is(dispatchError)) {
   *   console.log('Insufficient balance error');
   * }
   * ```
   */
  get errors(): ChainApi['errors'] {
    return this.#client.errors;
  }

  /**
   * View functions interface (requires Metadata V16+).
   *
   * @example
   * ```typescript
   * // Call a view function
   * const result = await client.view.voterList.scores(ALICE_ADDRESS);
   * ```
   */
  get view(): ChainApi['view'] {
    return this.#client.view;
  }

  /**
   * Block explorer interface for accessing block data.
   *
   * Provides methods to get/subscribe to best and finalized blocks,
   * as well as retrieve block headers and bodies.
   *
   * @example
   * ```typescript
   * // Get the current best block
   * const bestBlock = await client.block.best();
   * console.log('Best block:', bestBlock.number, bestBlock.hash);
   *
   * // Subscribe to finalized blocks
   * const unsub = client.block.finalized((block) => {
   *   console.log('Finalized block:', block.number);
   * });
   *
   * // Get block header and body
   * const header = await client.block.header(blockHash);
   * const body = await client.block.body(blockHash);
   * ```
   */
  get block(): BlockExplorer {
    return this.#client.block;
  }

  /**
   * Chain specification interface for accessing chain information.
   *
   * Provides methods to get chain name, genesis hash, and chain properties.
   *
   * @example
   * ```typescript
   * const chainName = await client.chainSpec.chainName();
   * const genesisHash = await client.chainSpec.genesisHash();
   * const properties = await client.chainSpec.properties();
   *
   * console.log(`Connected to ${chainName}`);
   * console.log('Token symbol:', properties.tokenSymbol);
   * console.log('Token decimals:', properties.tokenDecimals);
   * ```
   */
  get chainSpec(): IChainSpec {
    return this.#client.chainSpec;
  }

  /**
   * Establishes connection to the blockchain network.
   *
   * @returns This client instance for method chaining
   */
  async connect(): Promise<this> {
    await this.#client.connect();

    return this;
  }

  /**
   * Closes the connection to the blockchain network.
   */
  async disconnect(): Promise<void> {
    await this.#client.disconnect();
  }

  /**
   * Subscribe to client events.
   *
   * @param event - The event to listen for ('ready', 'connected', 'disconnected', 'reconnecting', 'runtimeUpgraded', 'error')
   * @param handler - Callback function to handle the event
   * @returns Unsubscribe function
   */
  on<Event extends ApiEvent = ApiEvent>(event: Event, handler: EventHandlerFn<Event>): () => void {
    return this.#client.on(event, handler);
  }

  /**
   * Subscribe to a client event once.
   *
   * @param event - The event to listen for
   * @param handler - Callback function to handle the event
   * @returns Unsubscribe function
   */
  once<Event extends ApiEvent = ApiEvent>(event: Event, handler: EventHandlerFn<Event>): () => void {
    return this.#client.once(event, handler);
  }

  /**
   * Unsubscribe from client events.
   *
   * @param event - The event to unsubscribe from
   * @param handler - The handler function to remove (optional, removes all handlers if not provided)
   * @returns This client instance for method chaining
   */
  off(event: ApiEvent, handler?: ((...args: any[]) => void) | undefined): this {
    this.#client.off(event, handler);
    return this;
  }

  /**
   * Get a client instance at a specific block hash.
   *
   * This allows querying historical state at a specific block.
   *
   * @template ChainApiAt - Chain API type for the historical state (defaults to ChainApi)
   * @param hash - The block hash to query at
   * @returns A client instance for querying state at the specified block
   *
   * @example
   * ```typescript
   * const clientAtBlock = await client.at('0x1234...');
   * const historicalBalance = await clientAtBlock.query.system.account('14...');
   * ```
   */
  at<ChainApiAt extends GenericSubstrateApi = ChainApi>(hash: `0x${string}`): Promise<ISubstrateClientAt<ChainApiAt>> {
    return this.#client.at(hash);
  }

  /**
   * Get the current runtime version with metadata sync.
   *
   * Unlike the `runtimeVersion` getter, this method ensures the corresponding
   * metadata for the runtime version is downloaded and set up. Useful for
   * preparing for runtime upgrades.
   *
   * @returns The current runtime version
   */
  getRuntimeVersion(): Promise<SubstrateRuntimeVersion> {
    return this.#client.getRuntimeVersion();
  }

  /**
   * Set or update the signer instance for signing transactions.
   *
   * @param signer - The signer instance (or undefined to clear)
   */
  setSigner(signer?: InjectedSigner | undefined): void {
    this.#client.setSigner(signer);
  }

  /**
   * Query multiple storage items in a single call or subscribe to multiple storage items.
   *
   * @example
   * ```typescript
   * // One-time query
   * const [balance, blockNumber] = await client.queryMulti([
   *   { fn: client.query.system.account, args: [ALICE] },
   *   { fn: client.query.system.number, args: [] }
   * ]);
   *
   * // Subscription
   * const unsub = await client.queryMulti([
   *   { fn: client.query.system.account, args: [ALICE] },
   *   { fn: client.query.system.number, args: [] }
   * ], ([balance, blockNumber]) => {
   *   console.log('Balance:', balance, 'Block:', blockNumber);
   * });
   * ```
   *
   * @template Fns - Array of storage query functions
   * @param queries - Array of query specifications with function and arguments
   * @param callback - Optional callback for subscription mode
   * @returns Query results array, or unsubscribe function if callback provided
   */
  queryMulti<Fns extends GenericStorageQuery[]>(queries: { [K in keyof Fns]: Query<Fns[K]> }): Promise<{
    [K in keyof Fns]: QueryFnResult<Fns[K]>;
  }>;
  queryMulti<Fns extends GenericStorageQuery[]>(
    queries: { [K in keyof Fns]: Query<Fns[K]> },
    callback: Callback<{ [K in keyof Fns]: QueryFnResult<Fns[K]> }>,
  ): Promise<Unsub>;
  queryMulti(
    queries: { fn: GenericStorageQuery; args?: any[] }[], // --
    callback?: Callback<any[]>,
  ): Promise<any[] | Unsub> {
    // @ts-ignore
    return this.#client.queryMulti(queries, callback);
  }

  /**
   * Broadcast a transaction to the network and track its status.
   *
   * @param tx - The transaction (hex string or Extrinsic instance)
   * @param callback - Optional callback for transaction status updates
   * @returns TxUnsub object with utility methods (`.untilFinalized()`, `.untilBestChainBlockIncluded()`)
   *
   * @example
   * ```typescript
   * // Wait for finalization
   * const result = await client.sendTx(txHex).untilFinalized();
   *
   * // With status callback to track progress
   * const unsub = await client.sendTx(txHex, (result) => {
   *   console.log('Status:', result.status);
   *   if (result.dispatchError) {
   *     console.error('Transaction failed:', result.dispatchError);
   *   }
   * });
   * ```
   */
  sendTx(tx: HexString | Extrinsic, callback?: Callback): TxUnsub {
    return this.#client.sendTx(tx, callback);
  }

  /**
   * Clear internal caches.
   *
   * @param keepMetadataCache - If true, preserves the metadata cache (default: false)
   */
  async clearCache(keepMetadataCache: boolean = false): Promise<void> {
    await (this.#client as BaseSubstrateClient<ChainApi, ApiEvent>).clearCache(keepMetadataCache);
  }
}
