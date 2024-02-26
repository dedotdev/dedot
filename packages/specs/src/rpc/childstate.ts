import { RpcModuleSpec } from '@dedot/types';
import { atBlockHashParam } from './shared';

export const childstate: RpcModuleSpec = {
  getKeys: {
    docs: 'Returns the keys with prefix from a child storage, leave empty to get all the keys',
    deprecated: 'Please use `getKeysPaged` with proper paging support',
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'prefix', type: 'StorageKey' },
      atBlockHashParam,
    ],
    type: 'Array<StorageKey>',
  },

  getKeysPaged: {
    docs: [
      'Returns the keys with prefix from a child storage with pagination support.',
      'Up to `count` keys will be returned.',
      'If `start_key` is passed, return next keys in storage in lexicographic order.',
    ],
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'prefix', type: 'Option<StorageKey>' },
      { name: 'count', type: 'number' },
      { name: 'startKey', type: 'StorageKey', isOptional: true },
      atBlockHashParam,
    ],
    type: 'Array<StorageKey>',
    alias: ['childstate_getKeysPagedAt'],
  },

  getStorage: {
    docs: "Returns a child storage entry at specific block's state.",
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'key', type: 'StorageKey' },
      atBlockHashParam,
    ],
    type: 'Option<StorageData>',
  },

  getStorageEntries: {
    docs: "Returns child storage entries for multiple keys at a specific block's state.",
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'keys', type: 'Array<StorageKey>' },
      atBlockHashParam,
    ],
    type: 'Array<Option<StorageData>>',
  },

  getStorageHash: {
    docs: "Returns the hash of a child storage entry at a block's state.",
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'key', type: 'StorageKey' },
      atBlockHashParam,
    ],
    type: 'Option<Hash>',
  },

  getStorageSize: {
    docs: "Returns the size of a child storage entry at a block's state",
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'key', type: 'StorageKey' },
      atBlockHashParam,
    ],
    type: 'Option<number>',
  },

  getChildReadProof: {
    docs: "Returns proof of storage for child key entries at a specific block's state",
    params: [
      { name: 'childStorageKey', type: 'PrefixedStorageKey' },
      { name: 'keys', type: 'Array<StorageKey>' },
      atBlockHashParam,
    ],
    type: 'ReadProof<Hash>',
  },
};
