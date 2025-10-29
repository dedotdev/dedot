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

export type ClientOptions<Rv extends RpcVersion = RpcVersion> = ApiOptions & {
  rpcVersion?: Rv;
};

export class Client<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // --
  Rv extends RpcVersion = RpcVersion,
> implements ISubstrateClient<ChainApi, Rv, DedotClientEvent>
{
  #client: ISubstrateClient<ChainApi, Rv, DedotClientEvent>;
  rpcVersion: RpcVersion;

  constructor(options: ClientOptions<Rv> | JsonRpcProvider) {
    let rpcVersion: RpcVersion = 'v2';
    if (!isJsonRpcProvider(options)) {
      if (options['rpcVersion'] === 'legacy') {
        rpcVersion = 'legacy';
      }
    }

    this.rpcVersion = rpcVersion;

    if (this.rpcVersion === 'legacy') {
      this.#client = new LegacyClient(options) as any;
    } else {
      this.#client = new DedotClient(options) as any;
    }
  }

  /**
   * Factory method to create a new DedotClient instance
   *
   * @param options
   */
  static async create<
    ChainApi extends VersionedGenericSubstrateApi = SubstrateApi, // --
    Rv extends RpcVersion = RpcVersion,
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
    Rv extends RpcVersion = RpcVersion,
  >(options: ClientOptions<Rv> | JsonRpcProvider): Promise<ISubstrateClient<ChainApi, Rv, DedotClientEvent>> {
    return Client.create<ChainApi, Rv>(options);
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

  get tx(): ChainApi[Rv]['tx'] {
    return this.#client.tx;
  }

  get rpc(): ChainApi[Rv]['rpc'] {
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

  get registry(): PortableRegistry<ChainApi[Rv]['types']> {
    return this.#client.registry;
  }

  get consts(): ChainApi[Rv]['consts'] {
    return this.#client.consts;
  }
  get query(): ChainApi[Rv]['query'] {
    return this.#client.query;
  }
  get call(): ChainApi[Rv]['call'] {
    return this.#client.call;
  }
  get events(): ChainApi[Rv]['events'] {
    return this.#client.events;
  }
  get errors(): ChainApi[Rv]['errors'] {
    return this.#client.errors;
  }
  get view(): ChainApi[Rv]['view'] {
    return this.#client.view;
  }

  async connect(): Promise<this> {
    await this.#client.connect();

    return this;
  }

  async disconnect(): Promise<void> {
    await this.#client.disconnect();
  }

  on(event: DedotClientEvent, handler: (...args: any[]) => void): () => void {
    return this.#client.on(event, handler);
  }
  once(event: DedotClientEvent, handler: (...args: any[]) => void): () => void {
    return this.#client.once(event, handler);
  }
  off(event: DedotClientEvent, handler?: ((...args: any[]) => void) | undefined): this {
    this.#client.off(event, handler);
    return this;
  }

  at<ChainApiAt extends VersionedGenericSubstrateApi = ChainApi>(
    hash: `0x${string}`,
  ): Promise<ISubstrateClientAt<ChainApiAt, Rv>> {
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
}
