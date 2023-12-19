// Generated by @delightfuldot/codegen

import type {
  GenericRpcCalls,
  AsyncMethod,
  Unsub,
  Callback,
  ExtrinsicOrHash,
  TransactionStatus,
  RpcMethods,
  ReadProof,
  RuntimeVersion,
  StorageChangeSet,
  TraceBlockResponse,
  ChainType,
  Health,
  NodeRole,
  PeerInfo,
  ChainProperties,
  SyncState,
  NetworkState,
} from '@delightfuldot/types';
import type {
  Bytes,
  Hash,
  Option,
  SignedBlock,
  BlockHash,
  BlockNumber,
  Header,
  PrefixedStorageKey,
  StorageKey,
  Metadata,
  StorageData,
} from '@delightfuldot/codecs';

export interface RpcCalls extends GenericRpcCalls {
  author: {
    /**
     * Checks if the keystore has private keys for the given public key and key type. Returns `true` if a private key could be found.
     *
     * @rpcname: author_hasKey
     **/
    hasKey(publicKey: Bytes, keyType: string): Promise<boolean>;

    /**
     * Checks if the keystore has private keys for the given session public keys. `session_keys` is the SCALE encoded session keys object from the runtime. Returns `true` iff all private keys could be found.
     *
     * @rpcname: author_hasSessionKeys
     **/
    hasSessionKeys(sessionKeys: Bytes): Promise<boolean>;

    /**
     * Insert a key into the keystore.
     *
     * @rpcname: author_insertKey
     **/
    insertKey(keyType: string, suri: string, publicKey: Bytes): Promise<void>;

    /**
     * Returns all pending extrinsics, potentially grouped by sender.
     *
     * @rpcname: author_pendingExtrinsics
     **/
    pendingExtrinsics(): Promise<Array<Bytes>>;

    /**
     * Remove given extrinsic from the pool and temporarily ban it to prevent reimporting.
     *
     * @rpcname: author_removeExtrinsic
     **/
    removeExtrinsic(bytesOrHash: Array<ExtrinsicOrHash>): Promise<Array<Hash>>;

    /**
     * Generate new session keys and returns the corresponding public keys.
     *
     * @rpcname: author_rotateKeys
     **/
    rotateKeys(): Promise<Bytes>;

    /**
     * Submit and subscribe to watch an extrinsic until unsubscribed
     *
     * @pubsub: author_extrinsicUpdate, author_submitAndWatchExtrinsic, author_unwatchExtrinsic
     **/
    submitAndWatchExtrinsic(extrinsic: Bytes, callback: Callback<TransactionStatus>): Promise<Unsub>;

    /**
     * Submit hex-encoded extrinsic for inclusion in block.
     *
     * @rpcname: author_submitExtrinsic
     **/
    submitExtrinsic(extrinsic: Bytes): Promise<Hash>;

    [method: string]: AsyncMethod;
  };
  chainHead: {
    /**
     * @rpcname: chainHead_unstable_body
     **/
    unstable_body: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_call
     **/
    unstable_call: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_follow
     **/
    unstable_follow: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_genesisHash
     **/
    unstable_genesisHash: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_header
     **/
    unstable_header: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_stopBody
     **/
    unstable_stopBody: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_stopCall
     **/
    unstable_stopCall: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_stopStorage
     **/
    unstable_stopStorage: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_storage
     **/
    unstable_storage: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_unfollow
     **/
    unstable_unfollow: AsyncMethod;

    /**
     * @rpcname: chainHead_unstable_unpin
     **/
    unstable_unpin: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  chain: {
    /**
     * Get header and body of a relay chain block
     *
     * @rpcname: chain_getBlock
     **/
    getBlock(at?: BlockHash): Promise<Option<SignedBlock>>;

    /**
     * Get the block hash for a specific block
     *
     * @rpcname: chain_getBlockHash
     **/
    getBlockHash(blockNumber?: BlockNumber): Promise<Option<BlockHash>>;

    /**
     * Get hash of the last finalized block in the canon chain
     *
     * @rpcname: chain_getFinalizedHead
     **/
    getFinalizedHead(): Promise<BlockHash>;

    /**
     * Retrieves the header for a specific block
     *
     * @rpcname: chain_getHeader
     **/
    getHeader(at?: BlockHash): Promise<Option<Header>>;

    /**
     * All head subscription.
     *
     * @pubsub: chain_allHead, chain_subscribeAllHeads, chain_unsubscribeAllHeads
     **/
    subscribeAllHeads(callback: Callback<Header>): Promise<Unsub>;

    /**
     * Retrieves the best finalized header via subscription
     *
     * @pubsub: chain_finalizedHead, chain_subscribeFinalizedHeads, chain_unsubscribeFinalizedHeads
     **/
    subscribeFinalizedHeads(callback: Callback<Header>): Promise<Unsub>;

    /**
     * Retrieves the best header via subscription
     *
     * @pubsub: chain_newHead, chain_subscribeNewHeads, chain_unsubscribeNewHeads
     **/
    subscribeNewHeads(callback: Callback<Header>): Promise<Unsub>;

    [method: string]: AsyncMethod;
  };
  childstate: {
    /**
     * @rpcname: childstate_getKeys
     **/
    getKeys: AsyncMethod;

    /**
     * @rpcname: childstate_getKeysPaged
     **/
    getKeysPaged: AsyncMethod;

    /**
     * @rpcname: childstate_getKeysPagedAt
     **/
    getKeysPagedAt: AsyncMethod;

    /**
     * @rpcname: childstate_getStorage
     **/
    getStorage: AsyncMethod;

    /**
     * @rpcname: childstate_getStorageEntries
     **/
    getStorageEntries: AsyncMethod;

    /**
     * @rpcname: childstate_getStorageHash
     **/
    getStorageHash: AsyncMethod;

    /**
     * @rpcname: childstate_getStorageSize
     **/
    getStorageSize: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  dev: {
    /**
     * @rpcname: dev_getBlockStats
     **/
    getBlockStats: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  eth: {
    /**
     * @rpcname: eth_accounts
     **/
    accounts: AsyncMethod;

    /**
     * @rpcname: eth_blockNumber
     **/
    blockNumber: AsyncMethod;

    /**
     * @rpcname: eth_call
     **/
    call: AsyncMethod;

    /**
     * @rpcname: eth_chainId
     **/
    chainId: AsyncMethod;

    /**
     * @rpcname: eth_coinbase
     **/
    coinbase: AsyncMethod;

    /**
     * @rpcname: eth_estimateGas
     **/
    estimateGas: AsyncMethod;

    /**
     * @rpcname: eth_feeHistory
     **/
    feeHistory: AsyncMethod;

    /**
     * @rpcname: eth_gasPrice
     **/
    gasPrice: AsyncMethod;

    /**
     * @rpcname: eth_getBalance
     **/
    getBalance: AsyncMethod;

    /**
     * @rpcname: eth_getBlockByHash
     **/
    getBlockByHash: AsyncMethod;

    /**
     * @rpcname: eth_getBlockByNumber
     **/
    getBlockByNumber: AsyncMethod;

    /**
     * @rpcname: eth_getBlockTransactionCountByHash
     **/
    getBlockTransactionCountByHash: AsyncMethod;

    /**
     * @rpcname: eth_getBlockTransactionCountByNumber
     **/
    getBlockTransactionCountByNumber: AsyncMethod;

    /**
     * @rpcname: eth_getCode
     **/
    getCode: AsyncMethod;

    /**
     * @rpcname: eth_getFilterChanges
     **/
    getFilterChanges: AsyncMethod;

    /**
     * @rpcname: eth_getFilterLogs
     **/
    getFilterLogs: AsyncMethod;

    /**
     * @rpcname: eth_getLogs
     **/
    getLogs: AsyncMethod;

    /**
     * @rpcname: eth_getStorageAt
     **/
    getStorageAt: AsyncMethod;

    /**
     * @rpcname: eth_getTransactionByBlockHashAndIndex
     **/
    getTransactionByBlockHashAndIndex: AsyncMethod;

    /**
     * @rpcname: eth_getTransactionByBlockNumberAndIndex
     **/
    getTransactionByBlockNumberAndIndex: AsyncMethod;

    /**
     * @rpcname: eth_getTransactionByHash
     **/
    getTransactionByHash: AsyncMethod;

    /**
     * @rpcname: eth_getTransactionCount
     **/
    getTransactionCount: AsyncMethod;

    /**
     * @rpcname: eth_getTransactionReceipt
     **/
    getTransactionReceipt: AsyncMethod;

    /**
     * @rpcname: eth_getUncleByBlockHashAndIndex
     **/
    getUncleByBlockHashAndIndex: AsyncMethod;

    /**
     * @rpcname: eth_getUncleByBlockNumberAndIndex
     **/
    getUncleByBlockNumberAndIndex: AsyncMethod;

    /**
     * @rpcname: eth_getUncleCountByBlockHash
     **/
    getUncleCountByBlockHash: AsyncMethod;

    /**
     * @rpcname: eth_getUncleCountByBlockNumber
     **/
    getUncleCountByBlockNumber: AsyncMethod;

    /**
     * @rpcname: eth_getWork
     **/
    getWork: AsyncMethod;

    /**
     * @rpcname: eth_hashrate
     **/
    hashrate: AsyncMethod;

    /**
     * @rpcname: eth_maxPriorityFeePerGas
     **/
    maxPriorityFeePerGas: AsyncMethod;

    /**
     * @rpcname: eth_mining
     **/
    mining: AsyncMethod;

    /**
     * @rpcname: eth_newBlockFilter
     **/
    newBlockFilter: AsyncMethod;

    /**
     * @rpcname: eth_newFilter
     **/
    newFilter: AsyncMethod;

    /**
     * @rpcname: eth_newPendingTransactionFilter
     **/
    newPendingTransactionFilter: AsyncMethod;

    /**
     * @rpcname: eth_protocolVersion
     **/
    protocolVersion: AsyncMethod;

    /**
     * @rpcname: eth_sendRawTransaction
     **/
    sendRawTransaction: AsyncMethod;

    /**
     * @rpcname: eth_sendTransaction
     **/
    sendTransaction: AsyncMethod;

    /**
     * @rpcname: eth_submitHashrate
     **/
    submitHashrate: AsyncMethod;

    /**
     * @rpcname: eth_submitWork
     **/
    submitWork: AsyncMethod;

    /**
     * @rpcname: eth_subscribe
     **/
    subscribe: AsyncMethod;

    /**
     * @rpcname: eth_syncing
     **/
    syncing: AsyncMethod;

    /**
     * @rpcname: eth_uninstallFilter
     **/
    uninstallFilter: AsyncMethod;

    /**
     * @rpcname: eth_unsubscribe
     **/
    unsubscribe: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  net: {
    /**
     * @rpcname: net_listening
     **/
    listening: AsyncMethod;

    /**
     * @rpcname: net_peerCount
     **/
    peerCount: AsyncMethod;

    /**
     * @rpcname: net_version
     **/
    version: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  offchain: {
    /**
     * @rpcname: offchain_localStorageGet
     **/
    localStorageGet: AsyncMethod;

    /**
     * @rpcname: offchain_localStorageSet
     **/
    localStorageSet: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  payment: {
    /**
     * @rpcname: payment_queryFeeDetails
     **/
    queryFeeDetails: AsyncMethod;

    /**
     * @rpcname: payment_queryInfo
     **/
    queryInfo: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  rpc: {
    /**
     * Retrieves the list of RPC methods that are exposed by the node
     *
     * @rpcname: rpc_methods
     **/
    methods(): Promise<RpcMethods>;

    [method: string]: AsyncMethod;
  };
  state: {
    /**
     * Call a method from the runtime API at a block's state.
     *
     * @rpcname: state_call
     **/
    call(method: string, data: Bytes, at?: BlockHash): Promise<Bytes>;

    /**
     * Returns proof of storage for child key entries at a specific block state.
     *
     * @rpcname: state_getChildReadProof
     **/
    getChildReadProof(childStorageKey: PrefixedStorageKey, keys: Array<StorageKey>, at?: BlockHash): Promise<ReadProof>;

    /**
     * Returns the keys with prefix, leave empty to get all the keys.
     *
     * @rpcname: state_getKeys
     * @deprecated: Please use `getKeysPaged` with proper paging support
     **/
    getKeys(prefix: StorageKey, at?: BlockHash): Promise<Array<StorageKey>>;

    /**
     * Returns the keys with prefix with pagination support. Up to `count` keys will be returned. If `start_key` is passed, return next keys in storage in lexicographic order.
     *
     * @rpcname: state_getKeysPaged
     **/
    getKeysPaged(prefix: StorageKey, count: number, startKey?: StorageKey, at?: BlockHash): Promise<Array<StorageKey>>;

    /**
     * Returns the runtime metadata
     *
     * @rpcname: state_getMetadata
     **/
    getMetadata(at?: BlockHash): Promise<Metadata>;

    /**
     * Returns the keys with prefix, leave empty to get all the keys
     *
     * @rpcname: state_getPairs
     * @deprecated: Please use `getKeysPaged` with proper paging support
     **/
    getPairs(prefix: StorageKey, at?: BlockHash): Promise<Array<[StorageKey, StorageData]>>;

    /**
     * Returns proof of storage entries at a specific block's state.
     *
     * @rpcname: state_getReadProof
     **/
    getReadProof(keys: Array<StorageKey>, at?: BlockHash): Promise<ReadProof>;

    /**
     * Get the runtime version.
     *
     * @rpcname: state_getRuntimeVersion
     **/
    getRuntimeVersion(): Promise<RuntimeVersion>;

    /**
     * Returns a storage entry at a specific block's state.
     *
     * @rpcname: state_getStorage
     **/
    getStorage(key: StorageKey, at?: BlockHash): Promise<Option<StorageData>>;

    /**
     * Returns the hash of a storage entry at a block's state.
     *
     * @rpcname: state_getStorageHash
     **/
    getStorageHash(key: StorageKey, at?: BlockHash): Promise<Option<Hash>>;

    /**
     * Returns the hash of a storage entry at a block's state.
     *
     * @rpcname: state_getStorageSize
     **/
    getStorageSize(key: StorageKey, at?: BlockHash): Promise<Option<bigint>>;

    /**
     * Query historical storage entries (by key) starting from a block given as the second parameter. NOTE: The first returned result contains the initial state of storage for all keys. Subsequent values in the vector represent changes to the previous state (diffs). WARNING: The time complexity of this query is O(|keys|*dist(block, hash)), and the memory complexity is O(dist(block, hash)) -- use with caution.
     *
     * @rpcname: state_queryStorage
     **/
    queryStorage(keys: Array<StorageKey>, fromBlock: Hash, at?: BlockHash): Promise<Array<StorageChangeSet>>;

    /**
     * Query storage entries (by key) at a block hash given as the second parameter. NOTE: Each StorageChangeSet in the result corresponds to exactly one element -- the storage value under an input key at the input block hash.
     *
     * @rpcname: state_queryStorageAt
     **/
    queryStorageAt(keys: Array<StorageKey>, at?: BlockHash): Promise<Array<StorageChangeSet>>;

    /**
     * New runtime version subscription
     *
     * @pubsub: state_runtimeVersion, state_subscribeRuntimeVersion, state_unsubscribeRuntimeVersion
     **/
    subscribeRuntimeVersion(callback: Callback<RuntimeVersion>): Promise<Unsub>;

    /**
     * Subscribes to storage changes for the provided keys
     *
     * @pubsub: state_storage, state_subscribeStorage, state_unsubscribeStorage
     **/
    subscribeStorage(keys: Array<StorageKey>, callback: Callback<StorageChangeSet>): Promise<Unsub>;

    /**
     * The `traceBlock` RPC provides a way to trace the re-execution of a single block, collecting Spans and Events from both the client and the relevant WASM runtime.
     *
     * @rpcname: state_traceBlock
     **/
    traceBlock(
      block: Hash,
      targets: Option<string>,
      storage_keys: Option<string>,
      methods: Option<string>,
    ): Promise<TraceBlockResponse>;

    [method: string]: AsyncMethod;
  };
  system: {
    /**
     * Returns the next valid index (aka nonce) for given account.
     *
     * This method takes into consideration all pending transactions
     * currently in the pool and if no transactions are found in the pool
     * it fallbacks to query the index from the runtime (aka. state nonce).
     *
     * @rpcname: system_accountNextIndex
     **/
    accountNextIndex(address: string): Promise<number>;

    /**
     * Adds the supplied directives to the current log filter
     *
     * The syntax is identical to the CLI `<target>=<level>`:
     *
     * `sync=debug,state=trace`
     *
     * @rpcname: system_addLogFilter
     **/
    addLogFilter(directives: string): Promise<void>;

    /**
     * Adds a reserved peer. Returns the empty string or an error. The string
     * parameter should encode a `p2p` multiaddr.
     *
     * `/ip4/198.51.100.19/tcp/30333/p2p/QmSk5HQbn6LhUwDiNMseVUjuRYhEtYj4aUZ6WfWoGURpdV`
     * is an example of a valid, passing multiaddr with PeerId attached.
     *
     * @rpcname: system_addReservedPeer
     **/
    addReservedPeer(peer: string): Promise<void>;

    /**
     * Get the chain's name. Given as a string identifier.
     *
     * @rpcname: system_chain
     **/
    chain(): Promise<string>;

    /**
     * Get the chain's type.
     *
     * @rpcname: system_chainType
     **/
    chainType(): Promise<ChainType>;

    /**
     * Dry run an extrinsic at a given block. Return SCALE encoded ApplyExtrinsicResult.
     *
     * @rpcname: system_dryRun
     **/
    dryRun(extrinsic: Bytes, at?: BlockHash): Promise<Bytes>;

    /**
     * Return health status of the node.
     *
     * Node is considered healthy if it is:
     * - connected to some peers (unless running in dev mode)
     * - not performing a major sync
     *
     * @rpcname: system_health
     **/
    health(): Promise<Health>;

    /**
     * Returns the multi-addresses that the local node is listening on
     *
     * The addresses include a trailing `/p2p/` with the local PeerId, and are thus suitable to
     * be passed to `addReservedPeer` or as a bootnode address for example.
     *
     * @rpcname: system_localListenAddresses
     **/
    localListenAddresses(): Promise<Array<string>>;

    /**
     * Returns the base58-encoded PeerId of the node.
     *
     * @rpcname: system_localPeerId
     **/
    localPeerId(): Promise<string>;

    /**
     * Get the node's implementation name. Plain old string.
     *
     * @rpcname: system_name
     **/
    name(): Promise<string>;

    /**
     * Returns the roles the node is running as
     *
     * @rpcname: system_nodeRoles
     **/
    nodeRoles(): Promise<Array<NodeRole>>;

    /**
     * Returns the currently connected peers
     *
     * @rpcname: system_peers
     **/
    peers(): Promise<Array<PeerInfo>>;

    /**
     * Get a custom set of properties as a JSON object, defined in the chain spec.
     *
     * @rpcname: system_properties
     **/
    properties(): Promise<ChainProperties>;

    /**
     * Remove a reserved peer. Returns the empty string or an error. The string
     * should encode only the PeerId e.g. `QmSk5HQbn6LhUwDiNMseVUjuRYhEtYj4aUZ6WfWoGURpdV`.
     *
     * @rpcname: system_removeReservedPeer
     **/
    removeReservedPeer(peerId: string): Promise<void>;

    /**
     * Returns the list of reserved peers
     *
     * @rpcname: system_reservedPeers
     **/
    reservedPeers(): Promise<Array<string>>;

    /**
     * Resets the log filter to Substrate defaults
     *
     * @rpcname: system_resetLogFilter
     **/
    resetLogFilter(): Promise<void>;

    /**
     * Returns the state of the syncing of the node: starting block, current best block, highest known block.
     *
     * @rpcname: system_syncState
     **/
    syncState(): Promise<SyncState>;

    /**
     * Returns current state of the network.
     *
     * **Warning**: This API is not stable. Please do not programmatically interpret its output,
     * as its format might change at any time.
     *
     * @rpcname: system_unstable_networkState
     **/
    unstable_networkState(): Promise<NetworkState>;

    /**
     * Get the node implementation's version. Should be a semver string.
     *
     * @rpcname: system_version
     **/
    version(): Promise<string>;

    [method: string]: AsyncMethod;
  };
  transaction: {
    /**
     * @rpcname: transaction_unstable_submitAndWatch
     **/
    unstable_submitAndWatch: AsyncMethod;

    /**
     * @rpcname: transaction_unstable_unwatch
     **/
    unstable_unwatch: AsyncMethod;

    [method: string]: AsyncMethod;
  };
  web3: {
    /**
     * @rpcname: web3_clientVersion
     **/
    clientVersion: AsyncMethod;

    /**
     * @rpcname: web3_sha3
     **/
    sha3: AsyncMethod;

    [method: string]: AsyncMethod;
  };
}
