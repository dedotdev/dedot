// import { author } from './author';
// import { babe } from './babe';
// import { beefy } from './beefy';
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
// import { web3 } from './web3';
import { RpcCallSpec, RpcCallsSpec } from '../types';
import { chain } from './chain';
import { syncstate } from './syncstate';
import { rpc } from './rpc';
import { state } from './state';
import { system } from './system';
import { author } from './author';

export const rpcCalls: RpcCallsSpec = {
  system,
  state,
  rpc,
  syncstate,
  chain,
  author,
  // babe,
  // beefy,
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
  // web3,
};

export const rpcCallSpecs: RpcCallSpec[] = Object.keys(rpcCalls)
  .map((moduleName) => {
    return Object.keys(rpcCalls[moduleName]).map((methodName) => {
      return { ...rpcCalls[moduleName][methodName], module: moduleName, method: methodName };
    });
  })
  .flat();

export const findRpcSpec = (rpcName: string) => {
  return rpcCallSpecs.find(
    (spec) => rpcName === `${spec.module}_${spec.method}` || rpcName === spec.name || rpcName === spec.pubsub?.at(1),
  );
};

export const findAliasRpcSpec = (rpcName: string) => {
  return rpcCallSpecs.find((spec) => spec.alias?.includes(rpcName));
};

export const isUnsubscribeMethod = (rpcName: string): boolean => {
  return rpcCallSpecs.some((spec) => spec.pubsub && spec.pubsub.slice(2).includes(rpcName));
};
