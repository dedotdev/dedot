import { RpcModuleSpec } from '../types';

export const state: RpcModuleSpec = {
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
