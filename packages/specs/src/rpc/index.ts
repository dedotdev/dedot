import { RpcCallSpec, RpcCallsSpec } from '@delightfuldot/types';
import { babe } from './babe';
import { beefy } from './beefy';
import { childstate } from './childstate';
import { mmr } from './mmr';
import { offchain } from './offchain';
import { chain } from './chain';
import { syncstate } from './syncstate';
import { rpc } from './rpc';
import { state } from './state';
import { system } from './system';
import { author } from './author';
import { payment } from './payment';
import { dev } from './dev';
import { grandpa } from './grandpa';

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
