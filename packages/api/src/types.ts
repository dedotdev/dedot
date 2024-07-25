import { BlockHash, Hash, Metadata, PortableRegistry } from '@dedot/codecs';
import type { ConnectionStatus, JsonRpcProvider, ProviderEvent } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import type { IStorage } from '@dedot/storage';
import type { GenericSubstrateApi, RpcVersion, RuntimeApiName, RuntimeApiSpec, Unsub } from '@dedot/types';
import type { HashFn, HexString, IEventEmitter } from '@dedot/utils';
import type { AnySignedExtension } from './extrinsic/index.js';

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
}

export type ApiEvent = ProviderEvent | 'ready' | 'runtimeUpgraded';

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
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
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
 * A generic interface for Substrate clients at a specific block
 */
export interface ISubstrateClientAt<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> {
  atBlockHash?: BlockHash;
  rpcVersion: RpcVersion;

  options: ApiOptions;
  genesisHash: Hash;
  runtimeVersion: SubstrateRuntimeVersion;
  metadata: Metadata;
  registry: PortableRegistry;

  rpc: ChainApi['rpc'];
  consts: ChainApi['consts'];
  query: ChainApi['query'];
  call: ChainApi['call'];
  events: ChainApi['events'];
  errors: ChainApi['errors'];
}

/**
 * A generic interface for Substrate clients
 */
export interface ISubstrateClient<
  ChainApi extends GenericSubstrateApi = GenericSubstrateApi,
  Events extends string = ApiEvent,
> extends IJsonRpcClient<ChainApi, Events>,
    ISubstrateClientAt<ChainApi> {
  options: ApiOptions;
  tx: ChainApi['tx'];
  at<ChainApiAt extends GenericSubstrateApi = ChainApi>(hash: BlockHash): Promise<ISubstrateClientAt<ChainApiAt>>;

  /**
   * Get current version of the runtime
   * This is similar to `.runtimeVersion` but also ensure
   * the corresponding metadata of this runtime version is downloaded & setup.
   *
   * This is helpful when you want to check runtime version to prepare for runtime upgrade
   */
  getRuntimeVersion(): Promise<SubstrateRuntimeVersion>;
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
