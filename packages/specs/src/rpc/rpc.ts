import { RpcModuleSpec } from '@dedot/types';

export const rpc: RpcModuleSpec = {
  methods: {
    docs: 'Retrieves the list of RPC methods that are exposed by the node',
    params: [],
    type: 'RpcMethods',
  },
};
