import { Metadata, PortableRegistry } from '@dedot/codecs';
import { ConnectionStatus, JsonRpcProvider } from '@dedot/providers';
import {
  Callback,
  GenericStorageQuery,
  InjectedSigner,
  Query,
  QueryFnResult,
  RpcV2,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';
import { HexString } from '@dedot/utils';
import { SubstrateApi } from '../chaintypes/index.js';
import { isJsonRpcProvider } from '../json-rpc/index.js';
import {
  ApiOptions,
  DedotClientEvent,
  ISubstrateClient,
  ISubstrateClientAt,
  SubstrateRuntimeVersion,
} from '../types.js';
import { DedotClient } from './DedotClient.js';
import { LegacyClient } from './LegacyClient.js';

export type ClientOptions<Rv extends RpcVersion = RpcV2> = ApiOptions & {
  rpcVersion?: Rv;
};

export class Client<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // --
  Rv extends RpcVersion = RpcV2,
> implements ISubstrateClient<ChainApi, Rv, DedotClientEvent>
{
  #internalClient: ISubstrateClient<ChainApi, Rv, DedotClientEvent>;
  rpcVersion: RpcVersion;
  options: ApiOptions;

  constructor(options: ClientOptions<Rv> | JsonRpcProvider) {
    let rpcVersion: RpcVersion = 'v2';
    if (!isJsonRpcProvider(options)) {
      if (options['rpcVersion'] === 'legacy') {
        rpcVersion = 'legacy';
      }
    }

    this.rpcVersion = rpcVersion;

    if (this.rpcVersion === 'legacy') {
      this.#internalClient = new LegacyClient(options) as any;
    } else {
      this.#internalClient = new DedotClient(options) as any;
    }

    this.options = this.#internalClient.options;
  }

  /**
   * Factory method to create a new DedotClient instance
   *
   * @param options
   */
  static async create<
    ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // --
    Rv extends RpcVersion = RpcV2,
  >(options: ClientOptions<Rv> | JsonRpcProvider): Promise<ISubstrateClient<ChainApi, Rv, DedotClientEvent>> {
    return new Client<ChainApi, Rv>(options).connect();
  }

  /**
   * Alias for __DedotClient.create__
   *
   * @param options
   */
  static async new<
    ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // --
    Rv extends RpcVersion = RpcV2,
  >(options: ClientOptions<Rv> | JsonRpcProvider): Promise<ISubstrateClient<ChainApi, Rv, DedotClientEvent>> {
    return Client.create(options);
  }

  get status(): ConnectionStatus {
    return this.#internalClient.status;
  }

  get provider(): JsonRpcProvider {
    return this.#internalClient.provider;
  }

  get tx(): ChainApi[Rv]['tx'] {
    return this.#internalClient.tx;
  }

  get rpc(): ChainApi[Rv]['rpc'] {
    return this.#internalClient.rpc;
  }

  get genesisHash(): HexString {
    return this.#internalClient.genesisHash;
  }

  get runtimeVersion(): SubstrateRuntimeVersion {
    return this.#internalClient.runtimeVersion;
  }

  get metadata(): Metadata {
    return this.#internalClient.metadata;
  }

  get registry(): PortableRegistry<ChainApi[Rv]['types']> {
    return this.#internalClient.registry;
  }

  get consts(): ChainApi[Rv]['consts'] {
    return this.#internalClient.consts;
  }
  get query(): ChainApi[Rv]['query'] {
    return this.#internalClient.query;
  }
  get call(): ChainApi[Rv]['call'] {
    return this.#internalClient.call;
  }
  get events(): ChainApi[Rv]['events'] {
    return this.#internalClient.events;
  }
  get errors(): ChainApi[Rv]['errors'] {
    return this.#internalClient.errors;
  }
  get view(): ChainApi[Rv]['view'] {
    return this.#internalClient.view;
  }

  async connect(): Promise<this> {
    await this.#internalClient.connect();

    return this;
  }

  async disconnect(): Promise<void> {
    await this.#internalClient.disconnect();
  }

  on(event: DedotClientEvent, handler: (...args: any[]) => void): () => void {
    return this.#internalClient.on(event, handler);
  }
  once(event: DedotClientEvent, handler: (...args: any[]) => void): () => void {
    return this.#internalClient.once(event, handler);
  }
  off(event: DedotClientEvent, handler?: ((...args: any[]) => void) | undefined): this {
    this.#internalClient.off(event, handler);
    return this;
  }

  at<ChainApiAt extends VersionedGenericSubstrateApi = ChainApi>(
    hash: `0x${string}`,
  ): Promise<ISubstrateClientAt<ChainApiAt, Rv>> {
    return this.#internalClient.at(hash);
  }

  getRuntimeVersion(): Promise<SubstrateRuntimeVersion> {
    return this.#internalClient.getRuntimeVersion();
  }

  setSigner(signer?: InjectedSigner | undefined): void {
    this.#internalClient.setSigner(signer);
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
    return this.#internalClient.queryMulti(queries, callback);
  }
}
