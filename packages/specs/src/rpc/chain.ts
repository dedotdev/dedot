import { RpcModuleSpec } from '../types';
import { atBlockHashParam } from './shared';

export const chain: RpcModuleSpec = {
  subscribeNewHeads: {
    docs: 'Retrieves the best header via subscription',
    params: [],
    pubsub: ['chain_newHead', 'chain_subscribeNewHeads', 'chain_unsubscribeNewHeads'],
    alias: ['chain_unsubscribeNewHead', 'chain_subscribeNewHead', 'subscribe_newHead', 'unsubscribe_newHead'],
    type: 'Header',
    isScale: true,
  },
  getBlockHash: {
    docs: 'Get the block hash for a specific block',
    params: [
      {
        isOptional: true,
        name: 'blockNumber',
        type: 'BlockNumber',
      },
    ],
    type: 'BlockHash',
  },
  getBlock: {
    docs: 'Get header and body of a relay chain block',
    params: [atBlockHashParam],
    type: 'Option<SignedBlock>',
    isScale: true,
  },
  getFinalizedHead: {
    alias: ['chain_getFinalisedHead'],
    docs: 'Get hash of the last finalized block in the canon chain',
    params: [],
    type: 'BlockHash',
  },
  getHeader: {
    alias: ['chain_getHead'],
    docs: 'Retrieves the header for a specific block',
    params: [atBlockHashParam],
    type: 'Header',
    isScale: true,
  },
  subscribeAllHeads: {
    docs: 'All head subscription.',
    params: [],
    pubsub: ['chain_allHead', 'chain_subscribeAllHeads', 'chain_unsubscribeAllHeads'],
    type: 'Header',
    isScale: true,
  },
  subscribeFinalizedHeads: {
    alias: ['chain_subscribeFinalisedHeads', 'chain_unsubscribeFinalisedHeads'],
    docs: 'Retrieves the best finalized header via subscription',
    params: [],
    pubsub: ['chain_finalizedHead', 'chain_subscribeFinalizedHeads', 'chain_unsubscribeFinalizedHeads'],
    type: 'Header',
    isScale: true,
  },
};
