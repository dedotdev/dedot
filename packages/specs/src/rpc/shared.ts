import { RpcParamSpec } from '@delightfuldot/types';

export const atBlockHashParam: RpcParamSpec = {
  name: 'at',
  type: 'BlockHash',
  isOptional: true,
};
