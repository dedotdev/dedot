import { BlockHash, Hash, Metadata, PortableRegistry } from '@dedot/codecs';
import type { ConnectionStatus, JsonRpcProvider, ProviderEvent } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import type { IStorage } from '@dedot/storage';
import {
  Callback,
  GenericStorageQuery,
  InjectedSigner,
  Query,
  QueryFnResult,
  RpcVersion,
  RuntimeApiName,
  RuntimeApiSpec,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';
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
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  Rv extends RpcVersion = RpcVersion,
  Events extends string = ProviderEvent,
> extends IEventEmitter<Events> {
  options: JsonRpcClientOptions;
  status: ConnectionStatus;
  provider: JsonRpcProvider;

  connect(): Promise<this>;

  disconnect(): Promise<void>;

  rpc: ChainApi[Rv]['rpc'];
}

/**
 * @internal
 */
export interface IGenericSubstrateClient<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  Rv extends RpcVersion = RpcVersion,
> {
  rpcVersion: RpcVersion;

  options: ApiOptions;
  genesisHash: Hash;
  runtimeVersion: SubstrateRuntimeVersion;
  metadata: Metadata;
  registry: PortableRegistry<ChainApi[Rv]['types']>;

  rpc: ChainApi[Rv]['rpc'];
  consts: ChainApi[Rv]['consts'];
  query: ChainApi[Rv]['query'];
  call: ChainApi[Rv]['call'];
  events: ChainApi[Rv]['events'];
  errors: ChainApi[Rv]['errors'];
  view: ChainApi[Rv]['view'];

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
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  Rv extends RpcVersion = RpcVersion,
> extends IGenericSubstrateClient<ChainApi, Rv> {
  atBlockHash: BlockHash;
}

/**
 * A generic interface for Substrate clients
 */
export interface ISubstrateClient<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  Rv extends RpcVersion = RpcVersion,
  Events extends string = ApiEvent,
> extends IJsonRpcClient<ChainApi, Rv, Events>,
    IGenericSubstrateClient<ChainApi, Rv> {
  options: ApiOptions;
  tx: ChainApi[Rv]['tx'];

  at<ChainApiAt extends VersionedGenericSubstrateApi = ChainApi>(
    hash: BlockHash,
  ): Promise<ISubstrateClientAt<ChainApiAt, Rv>>;

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
