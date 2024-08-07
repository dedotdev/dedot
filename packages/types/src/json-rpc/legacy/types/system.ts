import { HexString } from '@dedot/utils';
import { SerdeEnum } from './serde.js';

/**
 * The type of a chain.
 * This can be used by tools to determine the type of a chain for
 * displaying additional information or enabling additional features.
 */
export type ChainType = SerdeEnum<{
  /**
   * A development chain that runs mainly on one node.
   */
  Development: void;
  /**
   * A local chain that runs locally on multiple nodes for testing purposes.
   */
  Local: void;
  /**
   * A live chain.
   */
  Live: void;
  /**
   * Some custom chain type.
   */
  Custom: string;
}>;

export interface ChainProperties {
  isEthereum?: boolean;
  ss58Format?: number;
  tokenDecimals?: number | Array<number>;
  tokenSymbol?: string | Array<string>;
  [prop: string]: any;
}

/**
 * Health struct returned by the RPC
 */
export interface Health {
  peers: number;
  isSyncing: boolean;
  shouldHavePeers: boolean;
}

/**
 * The state of the syncing of the node.
 */
export interface SyncState {
  // Height of the block at which syncing started.
  startingBlock: number;
  // Height of the current best block of the node.
  currentBlock: number;
  // Height of the highest block in the network.
  highestBlock: number;
}

/**
 * Network Peer information
 */
export interface PeerInfo {
  // Peer ID
  peerId: string;
  // Roles
  roles: string;
  // Peer best block hash
  bestHash: HexString;
  // Peer best block number
  bestNumber: number;
}

/**
 * The role the node is running as
 */
export type NodeRole = SerdeEnum<{
  // The node is a full node
  Full: void;
  // The node is an authority
  Authority: void;
}>;

export type NetworkState = Record<string, unknown>;
