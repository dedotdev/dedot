import { GenericJsonRpcApis } from '@dedot/types';
import { RpcMethods } from './types/index.js';
import { AuthorJsonRpcApis } from './author.js';
import { BabeJsonRpcApi } from './babe.js';
import { BeefyJsonRpcApis } from './beefy.js';
import { ChainJsonRpcApis } from './chain.js';
import { ChildStateJsonRpcApis } from './childstate.js';
import { DevJsonRpcApis } from './dev.js';
import { GrandpaJsonRpcApis } from './grandpa.js';
import { MmrJsonRpcApis } from './mmr.js';
import { OffchainJsonRpcApis } from './offchain.js';
import { PaymentJsonRpcApis } from './payment.js';
import { StateJsonRpcApis } from './state.js';
import { SyncStateJsonRpcApis } from './syncstate.js';
import { SystemJsonRpcApis } from './system.js';

export * from './types/index.js';

export interface LegacyJsonRpcApis
  extends AuthorJsonRpcApis,
    BabeJsonRpcApi,
    BeefyJsonRpcApis,
    ChainJsonRpcApis,
    ChildStateJsonRpcApis,
    DevJsonRpcApis,
    GrandpaJsonRpcApis,
    MmrJsonRpcApis,
    OffchainJsonRpcApis,
    PaymentJsonRpcApis,
    StateJsonRpcApis,
    SyncStateJsonRpcApis,
    SystemJsonRpcApis,
    GenericJsonRpcApis<'legacy'> {
  /**
   * Retrieves the list of RPC methods that are exposed by the node
   *
   * @rpcname rpc_methods
   **/
  rpc_methods: () => Promise<RpcMethods>;
}
