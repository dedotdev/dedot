import { RpcModuleSpec } from '../types';

export const offchain: RpcModuleSpec = {
  localStorageSet: {
    docs: 'Set offchain local storage under given key and prefix.',
    params: [
      {
        name: 'kind',
        type: 'StorageKind',
      },
      {
        name: 'key',
        type: 'Bytes',
      },
      {
        name: 'value',
        type: 'Bytes',
      },
    ],
    type: 'void',
  },

  localStorageGet: {
    docs: 'Get offchain local storage under given key and prefix.',
    params: [
      {
        name: 'kind',
        type: 'StorageKind',
      },
      {
        name: 'key',
        type: 'Bytes',
      },
    ],
    type: 'Option<Bytes>',
  },
};
