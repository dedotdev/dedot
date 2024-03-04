import { RpcModuleSpec } from '@dedot/types';
import { atBlockHashParam } from './shared';
import { $Metadata } from '@dedot/codecs';

export const state: RpcModuleSpec = {
  call: {
    docs: "Call a method from the runtime API at a block's state.",
    params: [
      {
        name: 'method',
        type: 'string',
      },
      {
        name: 'data',
        type: 'Bytes',
      },
      atBlockHashParam,
    ],
    type: 'Bytes',
    alias: ['state_callAt'],
  },
  getKeys: {
    docs: 'Returns the keys with prefix, leave empty to get all the keys.',
    deprecated: 'Please use `getKeysPaged` with proper paging support',
    params: [{ name: 'prefix', type: 'StorageKey' }, atBlockHashParam],
    type: 'Array<StorageKey>',
  },
  getPairs: {
    docs: 'Returns the keys with prefix, leave empty to get all the keys',
    deprecated: 'Please use `getKeysPaged` with proper paging support',
    params: [{ name: 'prefix', type: 'StorageKey' }, atBlockHashParam],
    type: 'Array<[StorageKey, StorageData]>',
  },
  getKeysPaged: {
    docs:
      'Returns the keys with prefix with pagination support.\n' +
      'Up to `count` keys will be returned.\n' +
      'If `start_key` is passed, return next keys in storage in lexicographic order.',
    params: [
      {
        name: 'prefix',
        type: 'Option<StorageKey>',
      },
      {
        name: 'count',
        type: 'number',
      },
      {
        isOptional: true,
        name: 'startKey',
        type: 'StorageKey',
      },
      atBlockHashParam,
    ],
    type: 'Array<StorageKey>',
    alias: ['state_getKeysPagedAt'],
  },
  getStorage: {
    docs: "Returns a storage entry at a specific block's state.",
    params: [{ name: 'key', type: 'StorageKey' }, atBlockHashParam],
    type: 'Option<StorageData>',
    alias: ['state_getStorageAt'],
  },
  getStorageHash: {
    docs: "Returns the hash of a storage entry at a block's state.",
    params: [{ name: 'key', type: 'StorageKey' }, atBlockHashParam],
    type: 'Option<Hash>',
    alias: ['state_getStorageHashAt'],
  },
  getStorageSize: {
    docs: "Returns the hash of a storage entry at a block's state.",
    params: [{ name: 'key', type: 'StorageKey' }, atBlockHashParam],
    type: 'Option<bigint>',
    alias: ['state_getStorageSizeAt'],
  },
  getMetadata: {
    docs: 'Returns the runtime metadata',
    params: [
      {
        isOptional: true,
        name: 'at',
        type: 'BlockHash',
      },
    ],
    type: 'Metadata',
    isScale: true,
    codec: $Metadata,
  },
  getRuntimeVersion: {
    docs: 'Get the runtime version.',
    params: [],
    type: 'RuntimeVersion',
    alias: ['chain_getRuntimeVersion'],
  },
  subscribeRuntimeVersion: {
    docs: 'New runtime version subscription',
    params: [],
    type: 'RuntimeVersion',
    pubsub: ['state_runtimeVersion', 'state_subscribeRuntimeVersion', 'state_unsubscribeRuntimeVersion'],
    alias: ['chain_subscribeRuntimeVersion', 'chain_unsubscribeRuntimeVersion'],
  },
  subscribeStorage: {
    docs: 'Subscribes to storage changes for the provided keys',
    params: [
      {
        name: 'keys',
        type: 'Array<StorageKey>',
      },
    ],
    pubsub: ['state_storage', 'state_subscribeStorage', 'state_unsubscribeStorage'],
    type: 'StorageChangeSet',
  },
  queryStorage: {
    docs:
      'Query historical storage entries (by key) starting from a block given as the second parameter.\n' +
      '\n' +
      'NOTE: The first returned result contains the initial state of storage for all keys.\n' +
      'Subsequent values in the vector represent changes to the previous state (diffs).\n' +
      'WARNING: The time complexity of this query is O(|keys|*dist(block, hash)), and the\n' +
      'memory complexity is O(dist(block, hash)) -- use with caution.',
    params: [{ name: 'keys', type: 'Array<StorageKey>' }, { name: 'fromBlock', type: 'Hash' }, atBlockHashParam],
    type: 'Array<StorageChangeSet>',
  },
  queryStorageAt: {
    docs:
      'Query storage entries (by key) at a block hash given as the second parameter.\n' +
      'NOTE: Each StorageChangeSet in the result corresponds to exactly one element --\n' +
      'the storage value under an input key at the input block hash.',
    params: [{ name: 'keys', type: 'Array<StorageKey>' }, atBlockHashParam],
    type: 'Array<StorageChangeSet>',
  },
  getReadProof: {
    docs: "Returns proof of storage entries at a specific block's state.",
    params: [{ name: 'keys', type: 'Array<StorageKey>' }, atBlockHashParam],
    type: 'ReadProof',
  },
  traceBlock: {
    docs:
      'The `traceBlock` RPC provides a way to trace the re-execution of a single\n' +
      'block, collecting Spans and Events from both the client and the relevant WASM runtime.\n',
    params: [
      { name: 'block', type: 'Hash' },
      { name: 'targets', type: 'Option<string>' },
      { name: 'storage_keys', type: 'Option<string>' },
      { name: 'methods', type: 'Option<string>' },
    ],
    type: 'TraceBlockResponse',
  },
  trieMigrationStatus: {
    docs:
      'Check current migration state.\n' +
      '\n' +
      'This call is performed locally without submitting any transactions. Thus executing this\n' +
      "won't change any state. Nonetheless it is a VERY costy call that should be\n" +
      'only exposed to trusted peers.',
    params: [atBlockHashParam],
    type: 'MigrationStatusResult',
  },
  getChildReadProof: {
    docs: 'Returns proof of storage for child key entries at a specific block state.',
    params: [
      {
        name: 'childStorageKey',
        type: 'PrefixedStorageKey',
      },
      {
        name: 'keys',
        type: 'Array<StorageKey>',
      },
      atBlockHashParam,
    ],
    type: 'ReadProof',
  },
};
