import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import {
  ApplyExtrinsicResult,
  BlockHash,
  BlockNumber,
  Bytes,
  FeeDetails,
  Hash,
  Header,
  Metadata,
  Option,
  PrefixedStorageKey,
  RuntimeDispatchInfo,
  RuntimeVersion,
  SignedBlock,
  StorageData,
  StorageKey,
  TransactionStatus,
  VersionedFinalityProof,
} from '@dedot/codecs';
import {
  BlockStats,
  ChainProperties,
  ChainType,
  EncodedFinalityProofs,
  EpochAuthorship,
  ExtrinsicOrHash,
  Health,
  JustificationNotification,
  LeavesProof,
  MigrationStatusResult,
  NetworkState,
  NodeRole,
  PeerInfo,
  ReadProof,
  ReportedRoundStates,
  RpcMethods,
  StorageChangeSet,
  StorageKind,
  SyncState,
  TraceBlockResponse,
} from './types/index.js';

export interface LegacyJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Checks if the keystore has private keys for the given public key and key type. Returns `true` if a private key could be found.
   *
   * @rpcname author_hasKey
   * @param {Bytes} publicKey
   * @param {string} keyType
   **/
  author_hasKey: (publicKey: Bytes, keyType: string) => Promise<boolean>;

  /**
   * Checks if the keystore has private keys for the given session public keys. `session_keys` is the SCALE encoded session keys object from the runtime. Returns `true` iff all private keys could be found.
   *
   * @rpcname author_hasSessionKeys
   * @param {Bytes} sessionKeys
   **/
  author_hasSessionKeys: (sessionKeys: Bytes) => Promise<boolean>;

  /**
   * Insert a key into the keystore.
   *
   * @rpcname author_insertKey
   * @param {string} keyType
   * @param {string} suri
   * @param {Bytes} publicKey
   **/
  author_insertKey: (keyType: string, suri: string, publicKey: Bytes) => Promise<void>;

  /**
   * Returns all pending extrinsics, potentially grouped by sender.
   *
   * @rpcname author_pendingExtrinsics
   **/
  author_pendingExtrinsics: () => Promise<Array<Bytes>>;

  /**
   * Remove given extrinsic from the pool and temporarily ban it to prevent reimporting.
   *
   * @rpcname author_removeExtrinsic
   * @param {Array<ExtrinsicOrHash>} bytesOrHash
   **/
  author_removeExtrinsic: (bytesOrHash: Array<ExtrinsicOrHash>) => Promise<Array<Hash>>;

  /**
   * Generate new session keys and returns the corresponding public keys.
   *
   * @rpcname author_rotateKeys
   **/
  author_rotateKeys: () => Promise<Bytes>;

  /**
   * Submit and subscribe to watch an extrinsic until unsubscribed
   *
   * @pubsub: author_extrinsicUpdate, author_submitAndWatchExtrinsic, author_unwatchExtrinsic
   * @param {Bytes} extrinsic
   **/
  author_submitAndWatchExtrinsic: (extrinsic: Bytes, callback: Callback<TransactionStatus>) => Promise<Unsub>;

  /**
   * Submit hex-encoded extrinsic for inclusion in block.
   *
   * @rpcname author_submitExtrinsic
   * @param {Bytes} extrinsic
   **/
  author_submitExtrinsic: (extrinsic: Bytes) => Promise<Hash>;

  /**
   * Returns data about which slots (primary or secondary) can be claimed in the current epoch with the keys in the keystore.
   *
   * @rpcname babe_epochAuthorship
   **/
  babe_epochAuthorship: () => Promise<Record<string, EpochAuthorship>>;

  /**
   * Returns hash of the latest BEEFY finalized block as seen by this client.
   * The latest BEEFY block might not be available if the BEEFY gadget is not running
   * in the network or if the client is still initializing or syncing with the network.
   * In such case an error would be returned.
   *
   * @rpcname beefy_getFinalizedHead
   **/
  beefy_getFinalizedHead: () => Promise<Hash>;

  /**
   * Returns the block most recently finalized by BEEFY, alongside its justification.
   *
   * @pubsub: beefy_justifications, beefy_subscribeJustifications, beefy_unsubscribeJustifications
   **/
  beefy_subscribeJustifications: (callback: Callback<VersionedFinalityProof>) => Promise<Unsub>;

  /**
   * Get header and body of a relay chain block
   *
   * @rpcname chain_getBlock
   * @param {BlockHash} at
   **/
  chain_getBlock: (at?: BlockHash) => Promise<Option<SignedBlock>>;

  /**
   * Get the block hash for a specific block
   *
   * @rpcname chain_getBlockHash
   * @param {BlockNumber} blockNumber
   **/
  chain_getBlockHash: (blockNumber?: BlockNumber) => Promise<Option<BlockHash>>;

  /**
   * Get hash of the last finalized block in the canon chain
   *
   * @rpcname chain_getFinalizedHead
   **/
  chain_getFinalizedHead: () => Promise<BlockHash>;

  /**
   * Retrieves the header for a specific block
   *
   * @rpcname chain_getHeader
   * @param {BlockHash} at
   **/
  chain_getHeader: (at?: BlockHash) => Promise<Option<Header>>;

  /**
   * All head subscription.
   *
   * @pubsub: chain_allHead, chain_subscribeAllHeads, chain_unsubscribeAllHeads
   **/
  chain_subscribeAllHeads: (callback: Callback<Header>) => Promise<Unsub>;

  /**
   * Retrieves the best finalized header via subscription
   *
   * @pubsub: chain_finalizedHead, chain_subscribeFinalizedHeads, chain_unsubscribeFinalizedHeads
   **/
  chain_subscribeFinalizedHeads: (callback: Callback<Header>) => Promise<Unsub>;

  /**
   * Retrieves the best header via subscription
   *
   * @pubsub: chain_newHead, chain_subscribeNewHeads, chain_unsubscribeNewHeads
   **/
  chain_subscribeNewHeads: (callback: Callback<Header>) => Promise<Unsub>;

  /**
   * Returns the keys with prefix from a child storage, leave empty to get all the keys
   *
   * @rpcname childstate_getKeys
   * @deprecated: Please use `getKeysPaged` with proper paging support
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} prefix
   * @param {BlockHash} at
   **/
  childstate_getKeys: (
    childStorageKey: PrefixedStorageKey,
    prefix: StorageKey,
    at?: BlockHash,
  ) => Promise<Array<StorageKey>>;

  /**
   * Returns the keys with prefix from a child storage with pagination support.
   * Up to `count` keys will be returned.
   * If `start_key` is passed, return next keys in storage in lexicographic order.
   *
   * @rpcname childstate_getKeysPaged
   * @param {PrefixedStorageKey} childStorageKey
   * @param {Option<StorageKey>} prefix
   * @param {number} count
   * @param {StorageKey} startKey
   * @param {BlockHash} at
   **/
  childstate_getKeysPaged: (
    childStorageKey: PrefixedStorageKey,
    prefix: Option<StorageKey>,
    count: number,
    startKey?: StorageKey,
    at?: BlockHash,
  ) => Promise<Array<StorageKey>>;

  /**
   * Returns a child storage entry at specific block's state.
   *
   * @rpcname childstate_getStorage
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  childstate_getStorage: (
    childStorageKey: PrefixedStorageKey,
    key: StorageKey,
    at?: BlockHash,
  ) => Promise<Option<StorageData>>;

  /**
   * Returns child storage entries for multiple keys at a specific block's state.
   *
   * @rpcname childstate_getStorageEntries
   * @param {PrefixedStorageKey} childStorageKey
   * @param {Array<StorageKey>} keys
   * @param {BlockHash} at
   **/
  childstate_getStorageEntries: (
    childStorageKey: PrefixedStorageKey,
    keys: Array<StorageKey>,
    at?: BlockHash,
  ) => Promise<Array<Option<StorageData>>>;

  /**
   * Returns the hash of a child storage entry at a block's state.
   *
   * @rpcname childstate_getStorageHash
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  childstate_getStorageHash: (
    childStorageKey: PrefixedStorageKey,
    key: StorageKey,
    at?: BlockHash,
  ) => Promise<Option<Hash>>;

  /**
   * Returns the size of a child storage entry at a block's state
   *
   * @rpcname childstate_getStorageSize
   * @param {PrefixedStorageKey} childStorageKey
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  childstate_getStorageSize: (
    childStorageKey: PrefixedStorageKey,
    key: StorageKey,
    at?: BlockHash,
  ) => Promise<Option<number>>;

  /**
   * Reexecute the specified `block_hash` and gather statistics while doing so.
   *
   * This function requires the specified block and its parent to be available
   * at the queried node. If either the specified block or the parent is pruned,
   * this function will return `None`.
   *
   * @rpcname dev_getBlockStats
   * @param {BlockHash} at
   **/
  dev_getBlockStats: (at?: BlockHash) => Promise<Option<BlockStats>>;

  /**
   * Prove finality for the given block number, returning the Justification for the last block in the set.
   *
   * @rpcname grandpa_proveFinality
   * @param {BlockNumber} blockNumber
   **/
  grandpa_proveFinality: (blockNumber: BlockNumber) => Promise<Option<EncodedFinalityProofs>>;

  /**
   * Returns the state of the current best round state as well as the ongoing background rounds
   *
   * @rpcname grandpa_roundState
   **/
  grandpa_roundState: () => Promise<ReportedRoundStates>;

  /**
   * Returns the block most recently finalized by Grandpa, alongside side its justification.
   *
   * @pubsub: grandpa_justifications, grandpa_subscribeJustifications, grandpa_unsubscribeJustifications
   **/
  grandpa_subscribeJustifications: (callback: Callback<JustificationNotification>) => Promise<Unsub>;

  /**
   * Generate an MMR proof for the given `block_numbers`.
   *
   * This method calls into a runtime with MMR pallet included and attempts to generate
   * an MMR proof for the set of blocks that have the given `block_numbers` with the MMR root at
   * `best_known_block_number`. `best_known_block_number` must be larger than all the
   * `block_numbers` for the function to succeed.
   *
   * Optionally via `at`, a block hash at which the runtime should be queried can be specified.
   * Optionally via `best_known_block_number`, the proof can be generated using the MMR's state
   * at a specific best block. Note that if `best_known_block_number` is provided, then also
   * specifying the block hash via `at` isn't super-useful here, unless you're generating proof
   * using non-finalized blocks where there are several competing forks. That's because MMR state
   * will be fixed to the state with `best_known_block_number`, which already points to
   * some historical block.
   *
   * Returns the (full) leaves and a proof for these leaves (compact encoding, i.e. hash of
   * the leaves). Both parameters are SCALE-encoded.
   * The order of entries in the `leaves` field of the returned struct
   * is the same as the order of the entries in `block_numbers` supplied
   *
   * @rpcname mmr_generateProof
   * @param {Array<BlockNumber>} blockNumbers
   * @param {BlockNumber} bestKnownBlockNumber
   * @param {BlockHash} at
   **/
  mmr_generateProof: (
    blockNumbers: Array<BlockNumber>,
    bestKnownBlockNumber?: BlockNumber,
    at?: BlockHash,
  ) => Promise<LeavesProof>;

  /**
   * Get the MMR root hash for the current best block
   *
   * @rpcname mmr_root
   * @param {BlockHash} at
   **/
  mmr_root: (at?: BlockHash) => Promise<Hash>;

  /**
   * Verify an MMR `proof`.
   *
   * This method calls into a runtime with MMR pallet included and attempts to verify
   * an MMR proof.
   *
   * Returns `true` if the proof is valid, else returns the verification error.
   *
   * @rpcname mmr_verifyProof
   * @param {LeavesProof} proof
   **/
  mmr_verifyProof: (proof: LeavesProof) => Promise<boolean>;

  /**
   * Verify an MMR `proof` statelessly given an `mmr_root`.
   *
   * This method calls into a runtime with MMR pallet included and attempts to verify
   * an MMR proof against a provided MMR root.
   *
   * Returns `true` if the proof is valid, else returns the verification error.
   *
   * @rpcname mmr_verifyProofStateless
   * @param {Hash} mmrRoot
   * @param {LeavesProof} proof
   **/
  mmr_verifyProofStateless: (mmrRoot: Hash, proof: LeavesProof) => Promise<boolean>;

  /**
   * Get offchain local storage under given key and prefix.
   *
   * @rpcname offchain_localStorageGet
   * @param {StorageKind} kind
   * @param {Bytes} key
   **/
  offchain_localStorageGet: (kind: StorageKind, key: Bytes) => Promise<Option<Bytes>>;

  /**
   * Set offchain local storage under given key and prefix.
   *
   * @rpcname offchain_localStorageSet
   * @param {StorageKind} kind
   * @param {Bytes} key
   * @param {Bytes} value
   **/
  offchain_localStorageSet: (kind: StorageKind, key: Bytes, value: Bytes) => Promise<void>;

  /**
   * Query the detailed fee of a given encoded extrinsic
   *
   * @rpcname payment_queryFeeDetails
   * @param {Bytes} extrinsic
   * @param {BlockHash} at
   **/
  payment_queryFeeDetails: (extrinsic: Bytes, at?: BlockHash) => Promise<FeeDetails>;

  /**
   * Retrieves the fee information for an encoded extrinsic
   *
   * @rpcname payment_queryInfo
   * @param {Bytes} extrinsic
   * @param {BlockHash} at
   **/
  payment_queryInfo: (extrinsic: Bytes, at?: BlockHash) => Promise<RuntimeDispatchInfo>;

  /**
   * Retrieves the list of RPC methods that are exposed by the node
   *
   * @rpcname rpc_methods
   **/
  rpc_methods: () => Promise<RpcMethods>;

  /**
   * Call a method from the runtime API at a block's state.
   *
   * @rpcname state_call
   * @param {string} method
   * @param {Bytes} data
   * @param {BlockHash} at
   **/
  state_call: (method: string, data: Bytes, at?: BlockHash) => Promise<Bytes>;

  /**
   * Returns proof of storage for child key entries at a specific block state.
   *
   * @rpcname state_getChildReadProof
   * @param {PrefixedStorageKey} childStorageKey
   * @param {Array<StorageKey>} keys
   * @param {BlockHash} at
   **/
  state_getChildReadProof: (
    childStorageKey: PrefixedStorageKey,
    keys: Array<StorageKey>,
    at?: BlockHash,
  ) => Promise<ReadProof>;

  /**
   * Returns the keys with prefix, leave empty to get all the keys.
   *
   * @rpcname state_getKeys
   * @deprecated: Please use `getKeysPaged` with proper paging support
   * @param {StorageKey} prefix
   * @param {BlockHash} at
   **/
  state_getKeys: (prefix: StorageKey, at?: BlockHash) => Promise<Array<StorageKey>>;

  /**
   * Returns the keys with prefix with pagination support. Up to `count` keys will be returned. If `start_key` is passed, return next keys in storage in lexicographic order.
   *
   * @rpcname state_getKeysPaged
   * @param {Option<StorageKey>} prefix
   * @param {number} count
   * @param {StorageKey} startKey
   * @param {BlockHash} at
   **/
  state_getKeysPaged: (
    prefix: Option<StorageKey>,
    count: number,
    startKey?: StorageKey,
    at?: BlockHash,
  ) => Promise<Array<StorageKey>>;

  /**
   * Returns the runtime metadata
   *
   * @rpcname state_getMetadata
   * @param {BlockHash} at
   **/
  state_getMetadata: (at?: BlockHash) => Promise<Metadata>;

  /**
   * Returns the keys with prefix, leave empty to get all the keys
   *
   * @rpcname state_getPairs
   * @deprecated: Please use `getKeysPaged` with proper paging support
   * @param {StorageKey} prefix
   * @param {BlockHash} at
   **/
  state_getPairs: (prefix: StorageKey, at?: BlockHash) => Promise<Array<[StorageKey, StorageData]>>;

  /**
   * Returns proof of storage entries at a specific block's state.
   *
   * @rpcname state_getReadProof
   * @param {Array<StorageKey>} keys
   * @param {BlockHash} at
   **/
  state_getReadProof: (keys: Array<StorageKey>, at?: BlockHash) => Promise<ReadProof>;

  /**
   * Get the runtime version.
   *
   * @rpcname state_getRuntimeVersion
   **/
  state_getRuntimeVersion: () => Promise<RuntimeVersion>;

  /**
   * Returns a storage entry at a specific block's state.
   *
   * @rpcname state_getStorage
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  state_getStorage: (key: StorageKey, at?: BlockHash) => Promise<Option<StorageData>>;

  /**
   * Returns the hash of a storage entry at a block's state.
   *
   * @rpcname state_getStorageHash
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  state_getStorageHash: (key: StorageKey, at?: BlockHash) => Promise<Option<Hash>>;

  /**
   * Returns the hash of a storage entry at a block's state.
   *
   * @rpcname state_getStorageSize
   * @param {StorageKey} key
   * @param {BlockHash} at
   **/
  state_getStorageSize: (key: StorageKey, at?: BlockHash) => Promise<Option<bigint>>;

  /**
   * Query historical storage entries (by key) starting from a block given as the second parameter. NOTE: The first returned result contains the initial state of storage for all keys. Subsequent values in the vector represent changes to the previous state (diffs). WARNING: The time complexity of this query is O(|keys|*dist(block, hash)), and the memory complexity is O(dist(block, hash)) -- use with caution.
   *
   * @rpcname state_queryStorage
   * @param {Array<StorageKey>} keys
   * @param {Hash} fromBlock
   * @param {BlockHash} at
   **/
  state_queryStorage: (keys: Array<StorageKey>, fromBlock: Hash, at?: BlockHash) => Promise<Array<StorageChangeSet>>;

  /**
   * Query storage entries (by key) at a block hash given as the second parameter. NOTE: Each StorageChangeSet in the result corresponds to exactly one element -- the storage value under an input key at the input block hash.
   *
   * @rpcname state_queryStorageAt
   * @param {Array<StorageKey>} keys
   * @param {BlockHash} at
   **/
  state_queryStorageAt: (keys: Array<StorageKey>, at?: BlockHash) => Promise<Array<StorageChangeSet>>;

  /**
   * New runtime version subscription
   *
   * @pubsub: state_runtimeVersion, state_subscribeRuntimeVersion, state_unsubscribeRuntimeVersion
   **/
  state_subscribeRuntimeVersion: (callback: Callback<RuntimeVersion>) => Promise<Unsub>;

  /**
   * Subscribes to storage changes for the provided keys
   *
   * @pubsub: state_storage, state_subscribeStorage, state_unsubscribeStorage
   * @param {Array<StorageKey>} keys
   **/
  state_subscribeStorage: (keys: Array<StorageKey>, callback: Callback<StorageChangeSet>) => Promise<Unsub>;

  /**
   * The `traceBlock` RPC provides a way to trace the re-execution of a single block, collecting Spans and Events from both the client and the relevant WASM runtime.
   *
   * @rpcname state_traceBlock
   * @param {Hash} block
   * @param {Option<string>} targets
   * @param {Option<string>} storage_keys
   * @param {Option<string>} methods
   **/
  state_traceBlock: (
    block: Hash,
    targets: Option<string>,
    storage_keys: Option<string>,
    methods: Option<string>,
  ) => Promise<TraceBlockResponse>;

  /**
   * Check current migration state. This call is performed locally without submitting any transactions. Thus executing this won't change any state. Nonetheless it is a VERY costy call that should be only exposed to trusted peers.
   *
   * @rpcname state_trieMigrationStatus
   * @param {BlockHash} at
   **/
  state_trieMigrationStatus: (at?: BlockHash) => Promise<MigrationStatusResult>;

  /**
   * Returns the JSON-serialized chainspec running the node, with a sync state.
   *
   * @rpcname sync_state_genSyncSpec
   * @param {boolean} raw
   **/
  syncstate_genSyncSpec: (raw: boolean) => Promise<Record<string, any>>;

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
