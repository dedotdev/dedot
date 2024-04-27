import { GenericJsonRpcApis } from '@dedot/types';

export interface SyncStateJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Returns the JSON-serialized chainspec running the node, with a sync state.
   *
   * @rpcname sync_state_genSyncSpec
   * @param {boolean} raw
   **/
  sync_state_genSyncSpec: (raw: boolean) => Promise<Record<string, any>>;
}
