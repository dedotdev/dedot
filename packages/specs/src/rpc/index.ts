// import { author } from './author';
// import { babe } from './babe';
// import { beefy } from './beefy';
// import { chain } from './chain';
// import { childstate } from './childstate';
// import { contracts } from './contracts';
// import { dev } from './dev';
// import { engine } from './engine';
// import { eth } from './eth';
// import { grandpa } from './grandpa';
// import { mmr } from './mmr';
// import { net } from './net';
// import { offchain } from './offchain';
// import { payment } from './payment';
// import { syncstate } from './syncstate';
// import { web3 } from './web3';
import { RpcCallsSpec } from '@delightfuldot/specs/types';
import { rpc } from './rpc';
import { state } from './state';
import { system } from './system';

export const rpcCalls: RpcCallsSpec = {
  system,
  state,
  rpc,
  // author,
  // babe,
  // beefy,
  // chain,
  // childstate,
  // contracts,
  // dev,
  // engine,
  // eth,
  // grandpa,
  // mmr,
  // net,
  // offchain,
  // payment,
  // syncstate,
  // web3,
};
