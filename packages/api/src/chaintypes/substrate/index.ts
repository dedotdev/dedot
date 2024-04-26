// Generated by @dedot/codegen

import { GenericSubstrateApi, RpcLegacy, RpcV2, RpcVersion } from '@dedot/types';
import { ChainConsts } from './consts.js';
import { ChainErrors } from './errors.js';
import { ChainEvents } from './events.js';
import { ChainJsonRpcApis } from './json-rpc.js';
import { ChainStorage } from './query.js';
import { RuntimeApis } from './runtime.js';
import { ChainTx } from './tx.js';

export * from './types.js';

export interface VersionedSubstrateApi<Rv extends RpcVersion> extends GenericSubstrateApi<Rv> {
  rpc: ChainJsonRpcApis<Rv>;
  consts: ChainConsts<Rv>;
  query: ChainStorage<Rv>;
  errors: ChainErrors<Rv>;
  events: ChainEvents<Rv>;
  call: RuntimeApis<Rv>;
  tx: ChainTx<Rv>;
}

export interface SubstrateApi {
  legacy: VersionedSubstrateApi<RpcLegacy>;
  v2: VersionedSubstrateApi<RpcV2>;
}
