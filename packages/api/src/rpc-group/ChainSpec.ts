import { RpcGroup } from './RpcGroup.js';
import { GenericSubstrateApi } from '@dedot/types';
import { SubstrateApi } from '../chaintypes/index.js';
import { Properties } from '@dedot/specs';

export class ChainSpec<ChainApi extends GenericSubstrateApi = SubstrateApi> extends RpcGroup<ChainApi> {
  async chainName(): Promise<string> {
    return this.api.rpc.chainSpec_v1_chainName();
  }

  async genesisHash(): Promise<string> {
    return this.api.rpc.chainSpec_v1_genesisHash();
  }

  async properties(): Promise<Properties> {
    return this.api.rpc.chainSpec_v1_properties();
  }
}
