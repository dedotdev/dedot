import { RuntimeApiMethodSpec, RuntimeApiName, RuntimeApiSpec, RuntimeApisSpec } from '@dedot/types';
import { stringSnakeCase, blake2AsHex } from '@dedot/utils';
import { discovery } from './discovery';
import { babe } from './babe';
import { metadata } from './metadata';
import { core } from './core';
import { system } from './system';
import { payment } from './payment';
import { blockBuilder } from './block_builder';
import { grandpa } from './grandpa';
import { mmr } from './mmr';
import { nominationPools } from './nomination_pools';
import { offchain } from './offchain';
import { session } from './session';
import { parachains } from './parachains';
import { beefy } from './beefy';
import { staking } from './staking';
import { transactionPool } from './transaction_pool';
import { genesisBuilder } from './genesis_builder';

export const runtimeApisSpec: RuntimeApisSpec = {
  discovery,
  babe,
  metadata,
  payment,
  core,
  system,
  blockBuilder,
  grandpa,
  mmr,
  nominationPools,
  offchain,
  session,
  parachains,
  beefy,
  staking,
  transactionPool,
  genesisBuilder,
};

export const runtimeApiNames: RuntimeApiName[] = Object.values(runtimeApisSpec).map(Object.keys).flat();

export const runtimeApiSpecs: RuntimeApiSpec[] = Object.values(runtimeApisSpec).map(extractRuntimeApisModule).flat();

export const runtimeApiMethodSpecs: RuntimeApiMethodSpec[] = runtimeApiSpecs.map(extractRuntimeApiSpec).flat();

export function extractRuntimeApisModule(runtimeApisModule: Record<string, RuntimeApiSpec[]>): RuntimeApiSpec[] {
  return Object.keys(runtimeApisModule)
    .map((runtimeApiName) => {
      return runtimeApisModule[runtimeApiName].map((spec) => ({ ...spec, runtimeApiName }));
    })
    .flat();
}

export function extractRuntimeApiSpec(runtimeApiSpec: RuntimeApiSpec): RuntimeApiMethodSpec[] {
  const { runtimeApiName, version, methods } = runtimeApiSpec;
  return Object.keys(methods).map((methodName) => ({
    ...methods[methodName],
    methodName,
    runtimeApiName,
    version,
  }));
}

export const findRuntimeApiSpec = (runtimeApiHash: string, version: number) => {
  const runtimeApiName = runtimeApiNames.find((one) => blake2AsHex(one, 64) === runtimeApiHash);

  return runtimeApiSpecs.find((one) => one.runtimeApiName === runtimeApiName && one.version === version);
};

export const findRuntimeApiMethodSpec = (callName: string, version: number) => {
  return runtimeApiMethodSpecs.find(
    (one) => `${one.runtimeApiName}_${stringSnakeCase(one.methodName)}` === callName && one.version === version,
  );
};
