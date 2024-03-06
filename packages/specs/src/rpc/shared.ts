import { RpcParamSpec } from '@dedot/types';

export const atBlockHashParam: RpcParamSpec = {
  name: 'at',
  type: 'BlockHash',
  isOptional: true,
};
