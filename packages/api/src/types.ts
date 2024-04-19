import { BlockHash, Hash, Metadata, PortableRegistry } from '@dedot/codecs';
import type { ConnectionStatus, JsonRpcProvider, ProviderEvent } from '@dedot/providers';
import type { AnyShape } from '@dedot/shape';
import { SubscriptionsInfo } from '@dedot/specs';
import type { IStorage } from '@dedot/storage';
import type { GenericSubstrateApi, RuntimeApiName, RuntimeApiSpec } from '@dedot/types';
import type { HashFn, HexString, IEventEmitter } from '@dedot/utils';
import type { AnySignedExtension } from './extrinsic/index.js';

export type NetworkEndpoint = string;
export type MetadataKey = `RAW_META/${string}`;

export interface JsonRpcClientOptions {
  provider?: JsonRpcProvider;
  /**
   * @description A `ProviderInterface` will be created based on the supplied endpoint.
   * If both `provider` and `endpoint` is provided, the `provider` will be used for connection.
   *
   * A valid endpoint should start with `wss://`, `ws://`, `https://` or `http://`
   */
  endpoint?: NetworkEndpoint;
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
   *
   * Catch-all Metadata Key (`RAW_META/ALL`) will be used
   * regardless of the `genesisHash` or `runtimeSpecVersion` of connected chain.
   *
   * If we supplied a raw-hex metadata to this option, it's a catch-all metadata.
   */
  metadata?: HexString | Record<MetadataKey, HexString>;
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

export interface NormalizedApiOptions extends ApiOptions {
  metadata?: Record<string, HexString>;
}

export type ApiEvent = ProviderEvent | 'ready';

export interface SubstrateRuntimeVersion {
  specName: string;
  implName: string;
  specVersion: number;
  implVersion: number;
  apis: Record<string, number>;
  transactionVersion: number;
}

export interface SubstrateChainProperties {
  isEthereum?: boolean;
  ss58Format?: number;
  tokenDecimals?: number | Array<number>;
  tokenSymbol?: string | Array<string>;
  [prop: string]: any;
}

export interface IJsonRpcClient<ChainApi extends GenericSubstrateApi, Events extends string = ProviderEvent>
  extends IEventEmitter<Events> {
  options: JsonRpcClientOptions;
  status: ConnectionStatus;
  provider: JsonRpcProvider;
  connect(): Promise<this>;
  disconnect(): Promise<void>;

  rpc: ChainApi['rpc'];
}

export interface ISubstrateClient<ChainApi extends GenericSubstrateApi, Events extends string = ApiEvent>
  extends IJsonRpcClient<ChainApi, Events> {
  options: NormalizedApiOptions;

  metadata: Metadata;
  registry: PortableRegistry;
  genesisHash: Hash;
  runtimeChain: string;
  runtimeVersion: SubstrateRuntimeVersion;
  chainProperties: SubstrateChainProperties;

  consts: ChainApi['consts'];
  query: ChainApi['query'];
  queryAt(blockHash: BlockHash): ChainApi['query'];
  call: ChainApi['call'];
  callAt(blockHash: BlockHash): ChainApi['call'];
  tx: ChainApi['tx'];
  events: ChainApi['events'];
  errors: ChainApi['errors'];
}
