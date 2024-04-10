import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { Properties } from '@dedot/specs';
import { IJsonRpcClient } from '../types.js';

export class ChainSpec extends JsonRpcGroup {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainSpec', supportedVersions: ['unstable', 'v1'], ...options });
  }

  async chainName(): Promise<string> {
    return this.send('chainName');
  }

  async genesisHash(): Promise<string> {
    return this.send('genesisHash');
  }

  async properties(): Promise<Properties> {
    return this.send('properties');
  }
}
