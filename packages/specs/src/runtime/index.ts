import { discovery } from './discovery';
import { babe } from './babe';
import { metadata } from './metadata';
import { RuntimeApisModules, RuntimeCallSpec, RuntimeApiSpec } from '@delightfuldot/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { stringSnakeCase } from '@delightfuldot/utils';

export const runtimeApisModules: RuntimeApisModules = { discovery, babe, metadata };

export const runtimeApisNames = Object.values(runtimeApisModules)
  .map((one) => Object.keys(one))
  .flat();

export const runtimesApisSpecs = Object.keys(runtimeApisModules)
  .map((module) => {
    return Object.keys(runtimeApisModules[module]).map((runtime) => {
      return runtimeApisModules[module][runtime].map(
        (spec) => ({ ...spec, moduleName: module, runtimeApiName: runtime }) as RuntimeApiSpec,
      );
    });
  })
  .flat(2);

export const runtimeCallsSpecs = runtimesApisSpecs
  .map(({ methods, runtimeApiName, version }) => {
    return Object.keys(methods).map(
      (methodName) => ({ ...methods[methodName], methodName, runtimeApiName, version }) as RuntimeCallSpec,
    );
  })
  .flat();

export const toKnownRuntimeApi = (runtimeApiHash: string) => {
  return runtimeApisNames.find((one) => blake2AsHex(one, 64) === runtimeApiHash);
};

export const findRuntimeCallSpec = (callName: string, version: number) => {
  return runtimeCallsSpecs.find(
    (one) => `${one.runtimeApiName}_${stringSnakeCase(one.methodName)}` === callName && one.version === version,
  );
};
