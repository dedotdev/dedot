import { JsonRpcGroup, JsonRpcGroupOptions } from './JsonRpcGroup.js';
import { GenericSubstrateApi } from '@dedot/types';
import { SubstrateApi } from '../chaintypes/index.js';
import { Properties } from '@dedot/specs';
import { IJsonRpcClient } from '../types.js';

export class ChainSpec<ChainApi extends GenericSubstrateApi = SubstrateApi> extends JsonRpcGroup<ChainApi> {
  constructor(client: IJsonRpcClient<ChainApi>, options?: Partial<JsonRpcGroupOptions>) {
    super(client, { prefix: 'chainSpec', ...options });
  }

  async chainName(): Promise<string> {
    return this.exec('chainName');
  }

  async genesisHash(): Promise<string> {
    return this.exec('genesisHash');
  }

  async properties(): Promise<Properties> {
    return this.exec('properties');
  }
}
