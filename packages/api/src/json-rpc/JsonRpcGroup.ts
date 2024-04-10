import { EventEmitter, IJsonRpcClient } from 'dedot';
import { RpcMethods } from '@dedot/specs';

export type JsonRpcGroupVersion = 'unstable' | `v${number}`;
export interface JsonRpcGroupOptions {
  prefix: string;
  version?: JsonRpcGroupVersion;

  rpcMethods?: string[];
  // TODO max supported version
}

export class JsonRpcGroup<Event extends string = string> extends EventEmitter<Event> {
  #detectedVersion?: JsonRpcGroupVersion;

  constructor(
    public client: IJsonRpcClient,
    public options: JsonRpcGroupOptions,
  ) {
    super();
  }

  async exec<T = any>(method: string, ...params: any[]): Promise<T> {
    const rpcMethod = `${this.prefix}_${await this.version()}_${method}`;
    return this.client.rpc[rpcMethod](...params);
  }

  get prefix(): string {
    return this.options.prefix;
  }

  async version(): Promise<JsonRpcGroupVersion> {
    const { version } = this.options;
    if (version) return version;

    return this.detectVersion();
  }

  async detectVersion(): Promise<JsonRpcGroupVersion> {
    if (!this.#detectedVersion) {
      this.#detectedVersion = await this.#detectVersion();
    }

    return this.#detectedVersion;
  }

  async #detectVersion(): Promise<JsonRpcGroupVersion> {
    const rpcMethods = this.options.rpcMethods || ((await this.client.rpc.rpc_methods()) as RpcMethods).methods;
    const prefixedMethods = rpcMethods.filter((method) => method.startsWith(`${this.prefix}_`));

    if (prefixedMethods.length === 0) {
      throw new Error(`No methods found with prefix ${this.prefix}`);
    }

    return prefixedMethods[0].split('_')[1] as `v${number}`;
  }
}
