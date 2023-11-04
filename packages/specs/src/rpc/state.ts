import { RpcModuleSpec } from '../types';
import { atBlockHashParam } from './shared';

export const state: RpcModuleSpec = {
  getStorage: {
    docs: "Returns a storage entry at a specific block's state.",
    params: [{ name: 'key', type: 'StorageKey', isScale: true }, atBlockHashParam],
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
};
