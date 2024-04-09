import { GenericSubstrateApi } from '@dedot/types';
import { ISubstrateClient, SubstrateApi } from 'dedot';

export abstract class RpcGroup<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  constructor(public api: ISubstrateClient<ChainApi>) {}
}
