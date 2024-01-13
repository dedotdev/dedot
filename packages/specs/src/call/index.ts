import { discovery } from './discovery';
import { babe } from './babe';
import { RuntimeApisModules, RuntimeApiSpec, RuntimeSpec } from '@delightfuldot/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { stringSnakeCase } from '@delightfuldot/utils';

/*
 * Ref: https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/types/src/interfaces/definitions.ts#L6-L52
 */
export const SUBSTRATE_RUNTIMES: [string, number][] = [
  ['AssetConversionApi', 1],
  ['AssetsApi', 1],
  ['AuraApi', 1],
  ['BabeApi', 2],
  ['BeefyApi', 3],
  ['Benchmark', 1],
  ['BlockBuilder', 6],
  ['ContractsApi', 2],
  ['AuthorityDiscoveryApi', 1],
  ['FungiblesApi', 2],
  ['GrandpaApi', 3],
  ['MmrApi', 2],
  ['NftsApi', 1],
  ['NominationPoolsApi', 1],
  ['DifficultyApi', 1],
  ['SessionKeys', 1],
  ['StakingApi', 1],
  ['AccountNonceApi', 1],
  ['TaggedTransactionQueue', 3],
  ['TransactionPaymentApi', 4],
  ['TransactionPaymentCallApi', 3],
  ['OffchainWorkerApi', 2],
];

export const runtimeApisModules: RuntimeApisModules = { discovery, babe };

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

export const hashToRuntime = (hash: string) => {
  return runtimes.find((one) => blake2AsHex(one, 64) === hash);
};

export const findRuntimeApiSpec = (callName: string, version: number) => {
  return runtimeApisSpec.find(
    (one) => `${one.runtime}_${stringSnakeCase(one.method)}` === callName && one.version === version,
  );
};
