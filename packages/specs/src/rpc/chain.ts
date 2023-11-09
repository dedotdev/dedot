import { RpcModuleSpec } from '../types';

export const chain: RpcModuleSpec = {
  subscribeNewHeads: {
    docs: 'Retrieves the best header via subscription',
    params: [],
    pubsub: ['chain_newHead', 'chain_subscribeNewHeads', 'chain_unsubscribeNewHeads'],
    alias: ['chain_unsubscribeNewHead', 'chain_subscribeNewHead', 'subscribe_newHead', 'unsubscribe_newHead'],
    type: 'Header',
    isScale: true,
  },
};
