import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';
import { RpcCalls } from './rpc';

export * from './types';
export * from './consts';

export interface SubstrateApi extends GenericSubstrateApi {
  rpc: RpcCalls;
  consts: ChainConsts;
}
