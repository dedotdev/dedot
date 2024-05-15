import { RpcMethods } from '@dedot/types/json-rpc';
import { EventEmitter } from '@dedot/utils';
import { IJsonRpcClient } from '../../types.js';

export type JsonRpcGroupVersion = 'unstable' | `v${number}`;
export interface JsonRpcGroupOptions {
  /**
   * Prefix of the json-rpc group.
   * E.g: chainHead, chainSpec, archive, etc.
   *
   * According to JSON-RPC v2 Spec: https://paritytech.github.io/json-rpc-interface-spec/grouping-functions-and-node-capabilities.html#grouping-functions-and-node-capabilities
   *
   * Note: The prefix should not contain any `_` character.
   */
  prefix: string;

  /**
   * By default, the version is automatically detected from the available rpc-methods.
   * If a fixed version is provided, it will be forced to use instead.
   */
  fixedVersion?: JsonRpcGroupVersion;

  /**
   * List of rpc-methods to use for version detection.
   * If not provided, the list will be fetched from the node/server.
   * This is helpful when the node does not support `rpc_methods` method
   * Or if we want to share the same rpc-methods list across multiple groups.
   */
  rpcMethods?: string[];

  /**
   * List of supported versions.
   * If provided, the detected version must be in this list else an error will be thrown.
   * This is helpful when we want to verify behaviour of new version before using/support it.
   * If not provided, any detected version will be used.
   */
  supportedVersions?: JsonRpcGroupVersion[];
}

/**
 * @name JsonRpcGroup
 * A group of json-rpc methods with a common prefix.
 *
 * JSON-RPC V2: https://paritytech.github.io/json-rpc-interface-spec/grouping-functions-and-node-capabilities.html#grouping-functions-and-node-capabilities
 */
export class JsonRpcGroup<Event extends string = string> extends EventEmitter<Event> {
  #detectedVersion?: JsonRpcGroupVersion;

  constructor(
    public client: IJsonRpcClient,
    public options: JsonRpcGroupOptions,
  ) {
    super();
  }

  /**
   * Check if the group is supported by the connected JSON-RPC server.
   */
  async supported(): Promise<boolean> {
    try {
      const detectedVersion = await this.#detectVersion();

      const { supportedVersions } = this.options;

      // if there aren't any specific supported versions, then any detected version is supported
      if (!supportedVersions || supportedVersions.length === 0) return true;

      return supportedVersions.includes(detectedVersion);
    } catch {}

    return false;
  }

  /**
   * Send a json-rpc request, note the method should not contain the prefix and version parts.
   *
   * @example
   * ```typescript
   * const client = await JsonRpcClient.new('wss://rpc.polkadot.io');
   * const achieve = new JsonRpcGroup(client, { prefix: 'archive', supportedVersions: ['unstable'] });
   *
   * const finalizedHeight = await achieve.send<number>('finalizedHeight'); // sending archive_unstable_finalizedHeight
   * console.log(finalizedHeight);
   * ```
   *
   * @param method
   * @param params
   */
  async send<T = any>(method: string, ...params: any[]): Promise<T> {
    const rpcMethod = `${this.prefix}_${await this.version()}_${method}`;
    return this.client.rpc[rpcMethod](...params);
  }

  /**
   * The prefix of the group
   */
  get prefix(): string {
    return this.options.prefix;
  }

  /**
   * Detect & return the version of the group.
   * This will be used to construct the json-rpc method name.
   */
  async version(): Promise<JsonRpcGroupVersion> {
    const { fixedVersion, supportedVersions } = this.options;
    if (fixedVersion) return fixedVersion;

    const detectedVersion = await this.#detectVersion();
    if (supportedVersions && supportedVersions.length > 0 && !supportedVersions.includes(detectedVersion)) {
      throw new Error(`Detected version ${detectedVersion} is not supported`);
    }

    return detectedVersion;
  }

  async #detectVersion(): Promise<JsonRpcGroupVersion> {
    if (!this.#detectedVersion) {
      this.#detectedVersion = await this.#doDetectVersion();
    }

    return this.#detectedVersion;
  }

  async #doDetectVersion(): Promise<JsonRpcGroupVersion> {
    const rpcMethods = this.options.rpcMethods || ((await this.client.rpc.rpc_methods()) as RpcMethods).methods;
    const prefixedMethods = rpcMethods.filter((method) => method.startsWith(`${this.prefix}_`));

    if (prefixedMethods.length === 0) {
      throw new Error(`No methods found with prefix ${this.prefix}`);
    }

    return prefixedMethods[0].split('_')[1] as `v${number}`;
  }
}
