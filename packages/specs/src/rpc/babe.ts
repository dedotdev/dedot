import { RpcModuleSpec } from '@delightfuldot/types';

export const babe: RpcModuleSpec = {
  epochAuthorship: {
    docs: 'Returns data about which slots (primary or secondary) can be claimed in the current epoch with the keys in the keystore.',
    params: [],
    type: 'Record<string, EpochAuthorship>',
  },
};
