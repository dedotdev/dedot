// Generated by @delightfuldot/codegen

import { GenericSubstrateApi } from '@delightfuldot/types';
import { ChainConsts } from './consts';
import { ChainStorage } from './query';
import { RpcCalls } from './rpc';
import { ChainErrors } from './errors';
import { ChainEvents } from './events';
import { RuntimeApis } from './runtime';
import { ChainTx } from './tx';

export * from './types';
export * from './consts';

export interface SubstrateApi extends GenericSubstrateApi {
  rpc: RpcCalls;
  consts: ChainConsts;
  query: ChainStorage;
  errors: ChainErrors;
  events: ChainEvents;
  call: RuntimeApis;
  tx: ChainTx;
}
