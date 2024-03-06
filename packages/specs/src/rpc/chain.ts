import * as $ from '@dedot/shape';
import { RpcModuleSpec } from '@dedot/types';
import { atBlockHashParam } from './shared';
import { $Header, $SignedBlock } from '@dedot/codecs';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/cbc8e5f7df2fa9735281a1388f5f7f4ae36cd25c/substrate/client/rpc-api/src/chain/mod.rs#L27
 */
export const chain: RpcModuleSpec = {
  getHeader: {
    alias: ['chain_getHead'],
    docs: 'Retrieves the header for a specific block',
    params: [atBlockHashParam],
    type: 'Option<Header>',
    isScale: true,
    codec: $.Option($Header),
  },
  getBlock: {
    docs: 'Get header and body of a relay chain block',
    params: [atBlockHashParam],
    type: 'Option<SignedBlock>',
    isScale: true,
    codec: $.Option($SignedBlock),
  },
  // TODO support get list of block hash
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/cbc8e5f7df2fa9735281a1388f5f7f4ae36cd25c/substrate/client/rpc-api/src/chain/mod.rs#L40-L43
  getBlockHash: {
    docs: 'Get the block hash for a specific block',
    params: [
      {
        isOptional: true,
        name: 'blockNumber',
        type: 'BlockNumber',
      },
    ],
    type: 'Option<BlockHash>',
  },
  getFinalizedHead: {
    alias: ['chain_getFinalisedHead'],
    docs: 'Get hash of the last finalized block in the canon chain',
    params: [],
    type: 'BlockHash',
  },
  subscribeAllHeads: {
    docs: 'All head subscription.',
    params: [],
    pubsub: ['chain_allHead', 'chain_subscribeAllHeads', 'chain_unsubscribeAllHeads'],
    type: 'Header',
    isScale: true,
    codec: $Header,
  },
  subscribeNewHeads: {
    docs: 'Retrieves the best header via subscription',
    params: [],
    pubsub: ['chain_newHead', 'chain_subscribeNewHeads', 'chain_unsubscribeNewHeads'],
    alias: ['chain_unsubscribeNewHead', 'chain_subscribeNewHead', 'subscribe_newHead', 'unsubscribe_newHead'],
    type: 'Header',
    isScale: true,
    codec: $Header,
  },
  subscribeFinalizedHeads: {
    alias: ['chain_subscribeFinalisedHeads', 'chain_unsubscribeFinalisedHeads'],
    docs: 'Retrieves the best finalized header via subscription',
    params: [],
    pubsub: ['chain_finalizedHead', 'chain_subscribeFinalizedHeads', 'chain_unsubscribeFinalizedHeads'],
    type: 'Header',
    isScale: true,
    codec: $Header,
  },
};
