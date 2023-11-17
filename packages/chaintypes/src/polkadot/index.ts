// Generated by @delightfuldot/codegen

import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';
import { ChainStorage } from './query';
import { RpcCalls } from './rpc';

export * from './types';
export * from './consts';

export interface PolkadotApi extends GenericSubstrateApi {
  rpc: RpcCalls;
  consts: ChainConsts;
  query: ChainStorage;
}
