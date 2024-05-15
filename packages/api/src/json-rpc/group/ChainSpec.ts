import { Properties } from '@dedot/types/json-rpc';
import { HexString } from '@dedot/utils';
import { IJsonRpcClient } from '../../types.js';
import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';

export class ChainSpec extends JsonRpcGroup {
  constructor(client: IJsonRpcClient, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainSpec', supportedVersions: ['unstable', 'v1'], ...options });
  }

  async chainName(): Promise<string> {
    return this.send('chainName');
  }

  async genesisHash(): Promise<HexString> {
    return this.send('genesisHash');
  }

  async properties(): Promise<Properties> {
    return this.send('properties');
  }
}
