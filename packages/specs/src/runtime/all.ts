import { RuntimeApiMethodSpec, RuntimeApiName, RuntimeApiSpec } from '@dedot/types';
import { AuthorityDiscoveryApi } from './discovery';
import { BabeApi } from './babe';
import { Metadata } from './metadata';
import { Core } from './core';
import { AccountNonceApi } from './system';
import { TransactionPaymentApi, TransactionPaymentCallApi } from './payment';
import { BlockBuilder } from './block_builder';
import { GrandpaApi } from './grandpa';
import { MmrApi } from './mmr';
import { NominationPoolsApi } from './nomination_pools';
import { OffchainWorkerApi } from './offchain';
import { SessionKeys } from './session';
import { ParachainHost } from './parachains';
import { BeefyApi, BeefyMmrApi } from './beefy';
import { StakingApi } from './staking';
import { TaggedTransactionQueue } from './transaction_pool';
import { GenesisBuilder } from './genesis_builder';

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
