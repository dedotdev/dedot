import { discovery } from './discovery';
import { babe } from './babe';
import { metadata } from './metadata';
import { core } from './core';
import { system } from './system';
import { assetConversion } from './assetConversion';
import { assets } from './assets';
import { payment } from './payment';
import { blockBuilder } from './blockBuilder';
import { grandpa } from './grandpa';
import { mmr } from './mmr';
// import { nominationPools } from './nominationPools';
// import { offchain } from './offchain';
import { RuntimeApisSpec, RuntimeCallSpec, RuntimeApiSpec, RuntimeApiName } from '@delightfuldot/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { stringSnakeCase } from '@delightfuldot/utils';

export const runtimeApisSpec: RuntimeApisSpec = {
  assetConversion,
  discovery,
  babe,
  metadata,
  payment,
  core,
  system,
  assets,
  blockBuilder,
  grandpa,
  mmr,
  // nominationPools,
  // offchain,
};

export const runtimeApiNames: RuntimeApiName[] = Object.values(runtimeApisSpec)
  .map((one) => Object.keys(one))
  .flat();

export const runtimeApiSpecs: RuntimeApiSpec[] = Object.keys(runtimeApisSpec)
  .map((module) => {
    return Object.keys(runtimeApisSpec[module]).map((runtime) => {
      return runtimeApisSpec[module][runtime].map(
        (spec) => ({ ...spec, moduleName: module, runtimeApiName: runtime }) as RuntimeApiSpec,
      );
    });
  })
  .flat(2);

export const runtimeCallSpecs: RuntimeCallSpec[] = runtimeApiSpecs
  .map(({ methods, runtimeApiName, version }) => {
    return Object.keys(methods).map(
      (methodName) => ({ ...methods[methodName], methodName, runtimeApiName, version }) as RuntimeCallSpec,
    );
  })
  .flat();

export const findRuntimeApiSpec = (runtimeApiHash: string, version: number) => {
  const runtimeApiName = runtimeApiNames.find((one) => blake2AsHex(one, 64) === runtimeApiHash);

  return runtimeApiSpecs.find((one) => one.runtimeApiName === runtimeApiName && one.version === version);
};

export const findRuntimeCallSpec = (callName: string, version: number) => {
  return runtimeCallSpecs.find(
    (one) => `${one.runtimeApiName}_${stringSnakeCase(one.methodName)}` === callName && one.version === version,
  );
};
