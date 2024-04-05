import type { HexString, IEventEmitter } from '@dedot/utils';
import type { AnySignedExtension } from './extrinsic/index.js';
import type { RuntimeApiName, RuntimeApiSpec, GenericSubstrateApi } from '@dedot/types';
import type { IStorage } from '@dedot/storage';
import type { JsonRpcProvider, ProviderEvent, ConnectionStatus } from '@dedot/providers';
import { SubscriptionsInfo } from '@dedot/specs';
import { BlockHash, Hash, Metadata, PortableRegistry } from '@dedot/codecs';

export type NetworkEndpoint = string;
export type MetadataKey = `RAW_META/${string}`;

export interface ApiOptions {
  provider?: JsonRpcProvider;
  /**
   * @description A `ProviderInterface` will be created based on the supplied endpoint.
   * If both `provider` and `endpoint` is provided, the `provider` will be used for connection.
   *
   * A valid endpoint should start with `wss://`, `ws://`, `https://` or `http://`
   */
  endpoint?: NetworkEndpoint;
  /**
   * @description Cache metadata in local storage for next time usage
   * For now this only supports browser environments
   *
   * @default: false
   */
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
  subscriptions?: SubscriptionsInfo;
}

export interface NormalizedApiOptions extends ApiOptions {
  metadata?: Record<string, HexString>;
}

export type ApiEventNames = ProviderEvent | 'ready';

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

export interface ISubstrateClient<ChainApi extends GenericSubstrateApi> extends IEventEmitter<ApiEventNames> {
  options: NormalizedApiOptions;
  status: ConnectionStatus;
  provider: JsonRpcProvider;
  connect(): Promise<this>;
  disconnect(): Promise<void>;

  metadata: Metadata;
  registry: PortableRegistry;
  genesisHash: Hash;
  runtimeChain: string;
  runtimeVersion: SubstrateRuntimeVersion;
  chainProperties: SubstrateChainProperties;

  rpc: ChainApi['rpc'];
  consts: ChainApi['consts'];
  query: ChainApi['query'];
  queryAt(blockHash: BlockHash): ChainApi['query'];
  call: ChainApi['call'];
  callAt(blockHash: BlockHash): ChainApi['call'];
  tx: ChainApi['tx'];
  events: ChainApi['events'];
  errors: ChainApi['errors'];
}
