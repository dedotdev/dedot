import { RuntimeApiMethodSpec, RuntimeApiName, RuntimeApiSpec } from '@dedot/types';
import { BabeApi } from './babe.js';
import { BeefyApi, BeefyMmrApi } from './beefy.js';
import { BlockBuilder } from './block-builder.js';
import { Core } from './core.js';
import { AuthorityDiscoveryApi } from './discovery.js';
import { GenesisBuilder } from './genesis-builder.js';
import { GrandpaApi } from './grandpa.js';
import { Metadata } from './metadata.js';
import { MmrApi } from './mmr.js';
import { NominationPoolsApi } from './nomination-pools.js';
import { OffchainWorkerApi } from './offchain.js';
import { ParachainHost } from './parachains.js';
import { TransactionPaymentApi, TransactionPaymentCallApi } from './payment.js';
import { SessionKeys } from './session.js';
import { StakingApi } from './staking.js';
import { AccountNonceApi } from './system.js';
import { TaggedTransactionQueue } from './transaction-pool.js';

export const RuntimeApis: Record<RuntimeApiName, RuntimeApiSpec[]> = {
  AuthorityDiscoveryApi,
  BabeApi,
  Metadata,
  Core,
  AccountNonceApi,
  TransactionPaymentApi,
  TransactionPaymentCallApi,
  BlockBuilder,
  GrandpaApi,
  MmrApi,
  NominationPoolsApi,
  OffchainWorkerApi,
  SessionKeys,
  ParachainHost,
  BeefyApi,
  BeefyMmrApi,
  StakingApi,
  TaggedTransactionQueue,
  GenesisBuilder,
};

export const toRuntimeApiMethods = (runtimeApiSpec: RuntimeApiSpec): RuntimeApiMethodSpec[] => {
  const { runtimeApiName, version, methods } = runtimeApiSpec;
  return Object.keys(methods).map((methodName) => ({
    ...methods[methodName],
    methodName,
    runtimeApiName,
    version,
  }));
};

export const toRuntimeApiSpecs = (specs: Record<string, RuntimeApiSpec[]>): RuntimeApiSpec[] => {
  return Object.keys(specs)
    .map((runtimeApiName) => specs[runtimeApiName].map((spec) => ({ ...spec, runtimeApiName })))
    .flat();
};

export const getRuntimeApiNames = (): RuntimeApiName[] => Object.keys(RuntimeApis);
export const getRuntimeApiSpecs = (): RuntimeApiSpec[] => toRuntimeApiSpecs(RuntimeApis);

export const getRuntimeApiMethodSpecs = (): RuntimeApiMethodSpec[] =>
  getRuntimeApiSpecs().map(toRuntimeApiMethods).flat();
