import { RpcModuleSpec } from '../types';
import { atBlockHashParam } from './shared';

export const state: RpcModuleSpec = {
  getStorage: {
    docs: "Returns a storage entry at a specific block's state.",
    params: [{ name: 'key', type: 'StorageKey' }, atBlockHashParam],
    type: 'Option<StorageData>',
    alias: ['state_getStorageAt'],
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
  },
  getRuntimeVersion: {
    docs: 'Get the runtime version.',
    params: [],
    type: 'SpVersionRuntimeVersion',
    alias: ['chain_getRuntimeVersion'],
  },
  subscribeRuntimeVersion: {
    docs: 'New runtime version subscription',
    params: [],
    type: 'SpVersionRuntimeVersion',
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
};
