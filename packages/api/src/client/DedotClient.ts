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
import { LegacyClient } from './LegacyClient.js';
import { V2Client } from './V2Client.js';

export type ClientOptions = ApiOptions & {
  rpcVersion?: RpcVersion;
};

export class DedotClient<
  ChainApi extends GenericSubstrateApi = SubstrateApi, // --
> implements ISubstrateClient<ChainApi, ApiEvent>
{
  #client: ISubstrateClient<ChainApi, ApiEvent>;
  rpcVersion: RpcVersion;

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
   * Factory method to create a new V2Client instance
   *
   * @param options
   */
  static async create<
    ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  >(options: ClientOptions | JsonRpcProvider): Promise<DedotClient<ChainApi>> {
    return new DedotClient<ChainApi>(options).connect();
  }

  /**
   * Alias for DedotClient.create__
   *
   * @param options
   */
  static async new<
    ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  >(options: ClientOptions | JsonRpcProvider): Promise<DedotClient<ChainApi>> {
    return DedotClient.create<ChainApi>(options);
  }

  static async legacy<
    ChainApi extends GenericSubstrateApi = SubstrateApi, // --
  >(options: ClientOptions | JsonRpcProvider): Promise<DedotClient<ChainApi>> {
    return DedotClient.create<ChainApi>(
      isJsonRpcProvider(options) // --
        ? { provider: options, rpcVersion: 'legacy' }
        : { ...options, rpcVersion: 'legacy' },
    );
  }

  get options(): ApiOptions {
    return this.#client.options;
  }

  get status(): ConnectionStatus {
    return this.#client.status;
  }

  get provider(): JsonRpcProvider {
    return this.#client.provider;
  }

  get tx(): ChainApi['tx'] {
    return this.#client.tx;
  }

  get rpc(): ChainApi['rpc'] {
    return this.#client.rpc;
  }

  get genesisHash(): HexString {
    return this.#client.genesisHash;
  }

  get runtimeVersion(): SubstrateRuntimeVersion {
    return this.#client.runtimeVersion;
  }

  get metadata(): Metadata {
    return this.#client.metadata;
  }

  get registry(): PortableRegistry<ChainApi['types']> {
    return this.#client.registry;
  }

  get consts(): ChainApi['consts'] {
    return this.#client.consts;
  }
  get query(): ChainApi['query'] {
    return this.#client.query;
  }
  get call(): ChainApi['call'] {
    return this.#client.call;
  }
  get events(): ChainApi['events'] {
    return this.#client.events;
  }
  get errors(): ChainApi['errors'] {
    return this.#client.errors;
  }
  get view(): ChainApi['view'] {
    return this.#client.view;
  }

  get block(): BlockExplorer {
    return this.#client.block;
  }

  get chainSpec(): IChainSpec {
    return this.#client.chainSpec;
  }

  async connect(): Promise<this> {
    await this.#client.connect();

    return this;
  }

  async disconnect(): Promise<void> {
    await this.#client.disconnect();
  }

  on<Event extends ApiEvent = ApiEvent>(event: Event, handler: EventHandlerFn<Event>): () => void {
    return this.#client.on(event, handler);
  }

  once(event: ApiEvent, handler: (...args: any[]) => void): () => void {
    return this.#client.once(event, handler);
  }

  off(event: ApiEvent, handler?: ((...args: any[]) => void) | undefined): this {
    this.#client.off(event, handler);
    return this;
  }

  at<ChainApiAt extends GenericSubstrateApi = ChainApi>(hash: `0x${string}`): Promise<ISubstrateClientAt<ChainApiAt>> {
    return this.#client.at(hash);
  }

  getRuntimeVersion(): Promise<SubstrateRuntimeVersion> {
    return this.#client.getRuntimeVersion();
  }

  setSigner(signer?: InjectedSigner | undefined): void {
    this.#client.setSigner(signer);
  }

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

  sendTx(tx: HexString | Extrinsic, callback?: Callback): TxUnsub {
    return this.#client.sendTx(tx, callback);
  }
}
