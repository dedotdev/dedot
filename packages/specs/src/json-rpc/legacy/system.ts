import { ApplyExtrinsicResult, BlockHash, Bytes } from '@dedot/codecs';
import { GenericJsonRpcApis } from '@dedot/types';
import { ChainProperties, ChainType, Health, NetworkState, NodeRole, PeerInfo, SyncState } from './types/index.js';

export interface SystemJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Returns the next valid index (aka nonce) for given account.
   *
   * This method takes into consideration all pending transactions
   * currently in the pool and if no transactions are found in the pool
   * it fallbacks to query the index from the runtime (aka. state nonce).
   *
   * @rpcname system_accountNextIndex
   * @param {string} address
   **/
  system_accountNextIndex: (address: string) => Promise<number>;

  /**
   * Adds the supplied directives to the current log filter
   *
   * The syntax is identical to the CLI `<target>=<level>`:
   *
   * `sync=debug,state=trace`
   *
   * @rpcname system_addLogFilter
   * @param {string} directives
   **/
  system_addLogFilter: (directives: string) => Promise<void>;

  /**
   * Adds a reserved peer. Returns the empty string or an error. The string
   * parameter should encode a `p2p` multiaddr.
   *
   * `/ip4/198.51.100.19/tcp/30333/p2p/QmSk5HQbn6LhUwDiNMseVUjuRYhEtYj4aUZ6WfWoGURpdV`
   * is an example of a valid, passing multiaddr with PeerId attached.
   *
   * @rpcname system_addReservedPeer
   * @param {string} peer
   **/
  system_addReservedPeer: (peer: string) => Promise<void>;

  /**
   * Get the chain's name. Given as a string identifier.
   *
   * @rpcname system_chain
   **/
  system_chain: () => Promise<string>;

  /**
   * Get the chain's type.
   *
   * @rpcname system_chainType
   **/
  system_chainType: () => Promise<ChainType>;

  /**
   * Dry run an extrinsic at a given block. Return SCALE encoded ApplyExtrinsicResult.
   *
   * @rpcname system_dryRun
   * @param {Bytes} extrinsic
   * @param {BlockHash} at
   **/
  system_dryRun: (extrinsic: Bytes, at?: BlockHash) => Promise<ApplyExtrinsicResult>;

  /**
   * Return health status of the node.
   *
   * Node is considered healthy if it is:
   * - connected to some peers (unless running in dev mode)
   * - not performing a major sync
   *
   * @rpcname system_health
   **/
  system_health: () => Promise<Health>;

  /**
   * Returns the multi-addresses that the local node is listening on
   *
   * The addresses include a trailing `/p2p/` with the local PeerId, and are thus suitable to
   * be passed to `addReservedPeer` or as a bootnode address for example.
   *
   * @rpcname system_localListenAddresses
   **/
  system_localListenAddresses: () => Promise<Array<string>>;

  /**
   * Returns the base58-encoded PeerId of the node.
   *
   * @rpcname system_localPeerId
   **/
  system_localPeerId: () => Promise<string>;

  /**
   * Get the node's implementation name. Plain old string.
   *
   * @rpcname system_name
   **/
  system_name: () => Promise<string>;

  /**
   * Returns the roles the node is running as
   *
   * @rpcname system_nodeRoles
   **/
  system_nodeRoles: () => Promise<Array<NodeRole>>;

  /**
   * Returns the currently connected peers
   *
   * @rpcname system_peers
   **/
  system_peers: () => Promise<Array<PeerInfo>>;

  /**
   * Get a custom set of properties as a JSON object, defined in the chain spec.
   *
   * @rpcname system_properties
   **/
  system_properties: () => Promise<ChainProperties>;

  /**
   * Remove a reserved peer. Returns the empty string or an error. The string
   * should encode only the PeerId e.g. `QmSk5HQbn6LhUwDiNMseVUjuRYhEtYj4aUZ6WfWoGURpdV`.
   *
   * @rpcname system_removeReservedPeer
   * @param {string} peerId
   **/
  system_removeReservedPeer: (peerId: string) => Promise<void>;

  /**
   * Returns the list of reserved peers
   *
   * @rpcname system_reservedPeers
   **/
  system_reservedPeers: () => Promise<Array<string>>;

  /**
   * Resets the log filter to Substrate defaults
   *
   * @rpcname system_resetLogFilter
   **/
  system_resetLogFilter: () => Promise<void>;

  /**
   * Returns the state of the syncing of the node: starting block, current best block, highest known block.
   *
   * @rpcname system_syncState
   **/
  system_syncState: () => Promise<SyncState>;

  /**
   * Returns current state of the network.
   *
   * **Warning**: This API is not stable. Please do not programmatically interpret its output,
   * as its format might change at any time.
   *
   * @rpcname system_unstable_networkState
   **/
  system_unstable_networkState: () => Promise<NetworkState>;

  /**
   * Get the node implementation's version. Should be a semver string.
   *
   * @rpcname system_version
   **/
  system_version: () => Promise<string>;
}
