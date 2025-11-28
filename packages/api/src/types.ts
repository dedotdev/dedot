import { BlockHash, Extrinsic, Hash, Header, Metadata, PortableRegistry } from '@dedot/codecs';
import type { ConnectionStatus, JsonRpcProvider, ProviderEvent } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import type { IStorage } from '@dedot/storage';
import {
  Callback,
  GenericStorageQuery,
  GenericSubstrateApi,
  InjectedSigner,
  Query,
  QueryFnResult,
  RpcVersion,
  RuntimeApiName,
  RuntimeApiSpec,
  TxUnsub,
  Unsub,
} from '@dedot/types';
import { Properties } from '@dedot/types/json-rpc';
import type { HashFn, HexString, IEventEmitter } from '@dedot/utils';
import type { SubstrateApi } from './chaintypes/index.js';
import type { AnySignedExtension } from './extrinsic/index.js';
import type { ChainHeadEvent } from './json-rpc/index.js';

export type MetadataKey = `RAW_META/${string}`;
export type SubscribeMethod = string;
export type UnsubscribeMethod = string;
export type NotificationMethod = string;
export type SubscriptionsInfo = Record<SubscribeMethod, [NotificationMethod, UnsubscribeMethod]>;

export interface JsonRpcClientOptions {
  /**
   * @description A JSON-RPC provider instance, it could be a `WsProvider` or `SmoldotProvider`
   */
  provider: JsonRpcProvider;
  subscriptions?: SubscriptionsInfo;
  scaledResponses?: Record<string, AnyShape>;
}

export interface ApiOptions extends JsonRpcClientOptions {
  cacheMetadata?: boolean;
  cacheStorage?: IStorage;
  /**
   * @description Metadata is usually downloaded from chain via RPC upon API initialization,
   * We can supply the metadata directly via this option to skip the download metadata step.
   *
   * Metadata Key format: `RAW_META/{genesisHash}/{runtimeSpecVersion}`
   *
   * If the `genesisHash` & `runtimeSpecVersion` of the supplied metadata key match with connected chain,
   * then use the provided metadata, else we fetch it anew from chain.
   */
  metadata?: Record<MetadataKey, HexString>;
  /**
   * @description User-defined chain-specific signed extensions
   */
  signedExtensions?: Record<string, AnySignedExtension>;

  /**
   * @description Custom runtime api definitions/specs
   *
   * You probably don't need to use this with the latest Metadata V15,
   * unless you're connecting to a chain supports only Metadata V14
   */
  runtimeApis?: Record<RuntimeApiName, RuntimeApiSpec[]>;
  /**
   * By default, an `UnknownApiError` error will be thrown out if an api is known (e.g: `api.query.pallet.unknown`) upon evaluation.
   * When set this to `false`, the api evaluation will simply return `undefined`
   *
   * @default true
   */
  throwOnUnknownApi?: boolean;
  /**
   * Customize hashing algorithm used
   *
   * @default blake2_256
   */
  hasher?: HashFn;
  /**
   * A signer instance to use for signing transactions
   */
  signer?: InjectedSigner;
  /**
   * Timeout in milliseconds for detecting stale WebSocket connections.
   * When set, monitors block subscription activity and triggers reconnection
   * to switch to a different endpoint if no blocks/events received within the timeout period.
   *
   * Note: This option is only supported when used with WsProvider.
   *
   * - Default: 30000 (30 seconds) - staling detection enabled
   * - 0: Disabled - no staling detection
   * - Any positive number: Custom timeout in milliseconds
   *
   * @default 30000
   */
  stalingDetectionTimeout?: number;
}

export type ApiEvent = ProviderEvent | 'ready' | 'runtimeUpgraded';
export type DedotClientEvent = ApiEvent | ChainHeadEvent;

export interface SubstrateRuntimeVersion {
  specName: string;
  implName: string;
  specVersion: number;
  implVersion: number;
  apis: Record<string, number>;
  transactionVersion: number;
}

/**
 * A generic interface for JSON-RPC clients
 */
export interface IJsonRpcClient<
  ChainApi extends GenericSubstrateApi = SubstrateApi,
  Events extends string = ProviderEvent,
> extends IEventEmitter<Events> {
  options: JsonRpcClientOptions;
  status: ConnectionStatus;
  provider: JsonRpcProvider;

  connect(): Promise<this>;

  disconnect(): Promise<void>;

  rpc: ChainApi['rpc'];
}

/**
 * @internal
 */
export interface IGenericSubstrateClient<
  ChainApi extends GenericSubstrateApi = SubstrateApi, // --
> {
  rpcVersion: RpcVersion;

  options: ApiOptions;
  genesisHash: Hash;
  runtimeVersion: SubstrateRuntimeVersion;
  metadata: Metadata;
  registry: PortableRegistry<ChainApi['types']>;

  rpc: ChainApi['rpc'];
  consts: ChainApi['consts'];
  query: ChainApi['query'];
  call: ChainApi['call'];
  events: ChainApi['events'];
  errors: ChainApi['errors'];
  view: ChainApi['view'];

  /**
   * Query multiple storage items in a single call
   *
   * This method allows you to query multiple storage items in a single call with type safety
   * for both the query functions and their results.
   *
   * @example
   * // One-time query with type-safe results
   * const [balance, blockNumber] = await client.queryMulti([
   *   { fn: client.query.system.account, args: [ALICE] },
   *   { fn: client.query.system.number, args: [] }
   * ]);
   *
   * @template Fns Array of storage query functions
   * @param queries - Array of query specifications, each with a function and optional arguments
   * @returns Array of decoded values with proper types
   */
  queryMulti<Fns extends GenericStorageQuery[]>(queries: { [K in keyof Fns]: Query<Fns[K]> }): Promise<{
    [K in keyof Fns]: QueryFnResult<Fns[K]>;
  }>;
}

/**
 * A generic interface for Substrate clients at a specific block
 */
export interface ISubstrateClientAt<
  ChainApi extends GenericSubstrateApi = SubstrateApi, // --
> extends IGenericSubstrateClient<ChainApi> {
  atBlockHash: BlockHash;
}

export interface BlockInfo {
  hash: BlockHash;
  number: number;
  parent: BlockHash;
  runtimeUpgraded: boolean;
}

export interface BlockExplorer {
  // Get the best block
  best(): Promise<BlockInfo>;
  // Subscribe to the best block
  best(callback: (block: BlockInfo) => void): () => void;
  // Get the finalized block
  finalized(): Promise<BlockInfo>;
  // Subscribe to the finalized block
  finalized(callback: (block: BlockInfo) => void): () => void;

  // Get the header of a block
  header(hash: BlockHash): Promise<Header>;
  // Get the body of a block
  body(hash: BlockHash): Promise<HexString[]>;
}

export interface IChainSpec {
  chainName(): Promise<string>;
  genesisHash(): Promise<HexString>;
  properties(): Promise<Properties>;
}

/**
 * A generic interface for Substrate clients
 */
export interface ISubstrateClient<
  ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  Events extends string = ApiEvent,
> extends IJsonRpcClient<ChainApi, Events>,
    IGenericSubstrateClient<ChainApi> {
  options: ApiOptions;
  tx: ChainApi['tx'];

  chainSpec: IChainSpec;
  block: BlockExplorer;

  at<ChainApiAt extends GenericSubstrateApi = ChainApi>(hash: BlockHash): Promise<ISubstrateClientAt<ChainApiAt>>;

  /**
   * Get current version of the runtime
   * This is similar to `.runtimeVersion` but also ensure
   * the corresponding metadata of this runtime version is downloaded & setup.
   *
   * This is helpful when you want to check runtime version to prepare for runtime upgrade
   */
  getRuntimeVersion(): Promise<SubstrateRuntimeVersion>;

  /**
   * Update the signer instance for signing transactions
   *
   * @param signer
   */
  setSigner(signer?: InjectedSigner): void;

  /**
   * Broadcasts a transaction to the network and monitors its status.
   *
   * This method accepts a transaction (either as a hex-encoded string or an Extrinsic instance)
   * and submits it to the network. It returns a TxUnsub object that allows you to:
   * - Subscribe to transaction status updates via an optional callback
   * - Wait for specific transaction states (finalized, included in best chain block)
   *
   * @param tx - The signed transaction to broadcast, either as a hex-encoded string or Extrinsic instance
   * @param callback - Optional callback function to receive transaction status updates. The callback
   *                   receives an ISubmittableResult object containing status, events, errors, tx hash, etc...
   *
   * @returns A TxUnsub object that is both a Promise<Unsub> and provides utility methods:
   *          - `.untilFinalized()` - Resolves when transaction is finalized
   *          - `.untilBestChainBlockIncluded()` - Resolves when transaction is included in best chain block
   *          - When awaited directly, resolves to an unsubscribe function
   *
   * @example
   * // Basic usage with callback for status updates
   * const unsub = await client.sendTx(rawTxHex, (result) => {
   *   console.log('Transaction status:', result.status);
   *   console.log('Transaction hash:', result.txHash);
   *   if (result.dispatchError) {
   *     console.error('Transaction failed:', result.dispatchError);
   *   }
   * });
   *
   * @example
   * // Wait for transaction to be included in best chain block
   * const result = await client.sendTx(rawTxHex, console.log).untilBestChainBlockIncluded();
   * console.log('Transaction included in block:', result);
   *
   * @example
   * // Wait for transaction finalization
   * const result = await client.sendTx(rawTxHex).untilFinalized();
   * console.log('Transaction finalized:', result);
   */
  sendTx(tx: HexString | Extrinsic, callback?: Callback): TxUnsub;

  /**
   * Query multiple storage items in a single call or subscribe to multiple storage items
   *
   * This method allows you to query multiple storage items in a single call or set up a subscription
   * to multiple storage items. It provides type safety for both the query functions and their results.
   *
   * @example
   * // One-time query with type-safe results
   * const [balance, blockNumber] = await client.queryMulti([
   *   { fn: client.query.system.account, args: [ALICE] },
   *   { fn: client.query.system.number, args: [] }
   * ]);
   *
   * // Subscription with callback
   * const unsub = await client.queryMulti([
   *   { fn: client.query.system.account, args: [ALICE] },
   *   { fn: client.query.system.number, args: [] }
   * ], (results) => {
   *   console.log('Balance:', results[0], 'Block number:', results[1]);
   * });
   *
   * @template Fns Array of storage query functions
   * @param queries - Array of query specifications, each with a function and optional arguments
   * @param callback - Optional callback for subscription-based queries
   * @returns For one-time queries: Array of decoded values with proper types; For subscriptions: Unsubscribe function
   */
  queryMulti<Fns extends GenericStorageQuery[]>(queries: { [K in keyof Fns]: Query<Fns[K]> }): Promise<{
    [K in keyof Fns]: QueryFnResult<Fns[K]>;
  }>;
  queryMulti<Fns extends GenericStorageQuery[]>(
    queries: { [K in keyof Fns]: Query<Fns[K]> },
    callback: Callback<{ [K in keyof Fns]: QueryFnResult<Fns[K]> }>,
  ): Promise<Unsub>;

  on<Event extends Events = Events>(event: Event, handler: EventHandlerFn<Event>): () => void;
}

export type EventHandlerFn<Event extends string> = EventTypes[Event];

interface EventTypes {
  ready: () => void;
  connected: (connectedEndpoint: string) => void;
  disconnected: () => void;
  reconnecting: () => void;
  runtimeUpgraded: (newRuntimeVersion: SubstrateRuntimeVersion, at: BlockInfo) => void;
  error: (error?: Error) => void;
  [event: string]: (...args: any[]) => void;
}

/**
 * A generic interface for broadcasting transactions
 */
export interface TxBroadcaster {
  /**
   * Broadcast a transaction to the network
   * @param tx
   * @returns {Unsub} A function to stop broadcasting the transaction
   */
  broadcastTx(tx: HexString): Promise<Unsub>;

  /**
   * Check if this broadcaster is supported,
   * We should check this before broadcasting a transaction
   */
  supported(): Promise<boolean>;
}
