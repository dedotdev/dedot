import { RpcCallSpec, RpcCallsSpec } from '@dedot/types';
import { babe } from './babe.js';
import { beefy } from './beefy.js';
import { childstate } from './childstate.js';
import { mmr } from './mmr.js';
import { offchain } from './offchain.js';
import { chain } from './chain.js';
import { syncstate } from './syncstate.js';
import { rpc } from './rpc.js';
import { state } from './state.js';
import { system } from './system.js';
import { author } from './author.js';
import { payment } from './payment.js';
import { dev } from './dev.js';
import { grandpa } from './grandpa.js';

export const rpcCalls: RpcCallsSpec = {
  system,
  state,
  rpc,
  syncstate,
  chain,
  author,
  payment,
  dev,
  grandpa,
  babe,
  beefy,
  childstate,
  mmr,
  offchain,
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
