import {
  BlockHash,
  Bytes,
  Hash,
  Metadata,
  Option,
  PrefixedStorageKey,
  RuntimeVersion,
  StorageData,
  StorageKey,
} from '@dedot/codecs';
import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { MigrationStatusResult, ReadProof, StorageChangeSet, TraceBlockResponse } from './types/index.js';

export interface StateJsonRpcApis extends GenericJsonRpcApis {
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
   * @subscription state_runtimeVersion, state_subscribeRuntimeVersion, state_unsubscribeRuntimeVersion
   **/
  state_subscribeRuntimeVersion: (callback: Callback<RuntimeVersion>) => Promise<Unsub>;

  /**
   * Subscribes to storage changes for the provided keys
   *
   * @subscription state_storage, state_subscribeStorage, state_unsubscribeStorage
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
}
