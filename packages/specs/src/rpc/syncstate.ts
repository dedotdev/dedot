import { RpcModuleSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bdf186870dc4a7d74d59cad338baf8478d0715b4/substrate/client/sync-state-rpc/src/lib.rs#L129
 */
export const syncstate: RpcModuleSpec = {
  genSyncSpec: {
    name: 'sync_state_genSyncSpec',
    docs: 'Returns the JSON-serialized chainspec running the node, with a sync state.',
    params: [
      {
        name: 'raw',
        type: 'boolean',
      },
    ],
    type: 'Record<string,any>',
  },
};
