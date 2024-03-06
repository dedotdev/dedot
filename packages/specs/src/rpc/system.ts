import { RpcModuleSpec } from '@dedot/types';
import { $ApplyExtrinsicResult } from '@dedot/codecs';

export const system: RpcModuleSpec = {
  ///
  /// Ref: https://github.com/paritytech/polkadot-sdk/blob/bdf186870dc4a7d74d59cad338baf8478d0715b4/substrate/client/rpc-api/src/system/mod.rs#L33
  ///
  name: {
    docs: "Get the node's implementation name. Plain old string.",
    params: [],
    type: 'string',
  },
  version: {
    docs: "Get the node implementation's version. Should be a semver string.",
    params: [],
    type: 'string',
  },
  chain: {
    docs: "Get the chain's name. Given as a string identifier.",
    params: [],
    type: 'string',
  },
  chainType: {
    docs: "Get the chain's type.",
    params: [],
    type: 'ChainType',
  },
  properties: {
    docs: 'Get a custom set of properties as a JSON object, defined in the chain spec.',
    params: [],
    type: 'ChainProperties',
  },
  health: {
    docs: [
      'Return health status of the node.\n',
      '\t\n',
      '\t Node is considered healthy if it is:\n',
      '\t - connected to some peers (unless running in dev mode)\n',
      '\t - not performing a major sync',
    ],
    params: [],
    type: 'Health',
  },
  localPeerId: {
    docs: 'Returns the base58-encoded PeerId of the node.',
    params: [],
    type: 'string',
  },
  localListenAddresses: {
    docs: [
      'Returns the multi-addresses that the local node is listening on\n',
      '\t\n',
      '\t The addresses include a trailing `/p2p/` with the local PeerId, and are thus suitable to\n',
      '\t be passed to `addReservedPeer` or as a bootnode address for example.',
    ],
    params: [],
    type: 'Array<string>',
  },
  peers: {
    docs: 'Returns the currently connected peers',
    isUnsafe: true,
    params: [],
    type: 'Array<PeerInfo>',
  },
  unstable_networkState: {
    docs: [
      'Returns current state of the network.\n',
      '\t\n',
      '\t **Warning**: This API is not stable. Please do not programmatically interpret its output,\n',
      '\t as its format might change at any time.\n',
    ],
    isUnsafe: true,
    params: [],
    type: 'NetworkState',
  },
  addReservedPeer: {
    docs: [
      'Adds a reserved peer. Returns the empty string or an error. The string\n',
      '\t parameter should encode a `p2p` multiaddr.\n',
      '\t\n',
      '\t `/ip4/198.51.100.19/tcp/30333/p2p/QmSk5HQbn6LhUwDiNMseVUjuRYhEtYj4aUZ6WfWoGURpdV`\n',
      '\t is an example of a valid, passing multiaddr with PeerId attached.',
    ],
    isUnsafe: true,
    params: [
      {
        name: 'peer',
        type: 'string',
      },
    ],
    type: 'void',
  },
  removeReservedPeer: {
    docs: [
      'Remove a reserved peer. Returns the empty string or an error. The string\n',
      '\tshould encode only the PeerId e.g. `QmSk5HQbn6LhUwDiNMseVUjuRYhEtYj4aUZ6WfWoGURpdV`.',
    ],
    isUnsafe: true,
    params: [
      {
        name: 'peerId',
        type: 'string',
      },
    ],
    type: 'void',
  },
  reservedPeers: {
    docs: 'Returns the list of reserved peers',
    params: [],
    type: 'Array<string>',
  },
  nodeRoles: {
    docs: 'Returns the roles the node is running as',
    params: [],
    type: 'Array<NodeRole>',
  },
  syncState: {
    docs: 'Returns the state of the syncing of the node: starting block, current best block, highest known block.',
    params: [],
    type: 'SyncState',
  },
  addLogFilter: {
    docs: [
      'Adds the supplied directives to the current log filter\n',
      '\t\n',
      '\tThe syntax is identical to the CLI `<target>=<level>`:\n',
      '\t\n',
      '\t`sync=debug,state=trace`',
    ],
    isUnsafe: true,
    params: [
      {
        name: 'directives',
        type: 'string',
      },
    ],
    type: 'void',
  },
  resetLogFilter: {
    docs: 'Resets the log filter to Substrate defaults',
    isUnsafe: true,
    params: [],
    type: 'void',
  },

  ///
  /// Ref: https://github.com/paritytech/polkadot-sdk/blob/bdf186870dc4a7d74d59cad338baf8478d0715b4/substrate/utils/frame/rpc/system/src/lib.rs#L41
  ///
  accountNextIndex: {
    docs: [
      'Returns the next valid index (aka nonce) for given account.\n',
      '\t\n',
      '\tThis method takes into consideration all pending transactions\n',
      '\tcurrently in the pool and if no transactions are found in the pool\n',
      '\tit fallbacks to query the index from the runtime (aka. state nonce).',
    ],
    params: [
      {
        name: 'address',
        type: 'string',
      },
    ],
    type: 'number',
    alias: ['account_nextIndex'],
  },
  dryRun: {
    docs: 'Dry run an extrinsic at a given block. Return SCALE encoded ApplyExtrinsicResult.',
    isUnsafe: true,
    params: [
      {
        name: 'extrinsic',
        type: 'Bytes',
      },
      {
        isOptional: true,
        name: 'at',
        type: 'BlockHash',
      },
    ],
    type: 'ApplyExtrinsicResult',
    isScale: true,
    codec: $ApplyExtrinsicResult,
    alias: ['system_dryRunAt'],
  },
};
