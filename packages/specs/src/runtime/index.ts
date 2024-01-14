import { discovery } from './discovery';
import { babe } from './babe';
import { metadata } from './metadata';
import { RuntimeApisModules, RuntimeApiSpec, RuntimeSpec } from '@delightfuldot/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { stringSnakeCase } from '@delightfuldot/utils';

export const runtimeApisModules: RuntimeApisModules = { discovery, babe, metadata };

export const runtimes = Object.values(runtimeApisModules)
  .map((one) => Object.keys(one))
  .flat();

export const runtimesSpec = Object.keys(runtimeApisModules)
  .map((module) => {
    return Object.keys(runtimeApisModules[module]).map((runtime) => {
      return runtimeApisModules[module][runtime].map((spec) => ({ ...spec, module, runtime }) as RuntimeSpec);
    });
  })
  .flat(2);

export const runtimeApisSpec = runtimesSpec
  .map(({ methods, runtime, version }) => {
    return Object.keys(methods).map((method) => ({ ...methods[method], method, runtime, version }) as RuntimeApiSpec);
  })
  .flat();

export const toKnownRuntime = (hash: string) => {
  return runtimes.find((one) => blake2AsHex(one, 64) === hash);
};

export const findRuntimeApiSpec = (callName: string, version: number) => {
  return runtimeApisSpec.find(
    (one) => `${one.runtime}_${stringSnakeCase(one.method)}` === callName && one.version === version,
  );
};
