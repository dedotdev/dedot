import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32Like, BytesLike, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { ContractConstructorMessage, ContractMessage } from './shared.js';
import { ContractMetadataV4 } from './v4.js';
import { ContractMetadataV5 } from './v5.js';

export * from './shared.js';

export type ContractMetadata = ContractMetadataV4 | ContractMetadataV5;

export type CallOptions = {
  value?: bigint;
  gasLimit?: Weight | undefined;
  storageDepositLimit?: bigint | undefined;
};

export type ConstructorCallOptions = CallOptions & {
  salt: BytesLike;
  caller: AccountId32Like;
};

export type ConstructorTxOptions = CallOptions & {
  salt: BytesLike;
  gasLimit: Weight;
};

export type ContractCallOptions = CallOptions & {
  caller: AccountId32Like;
};

export type ContractTxOptions = CallOptions & {
  gasLimit: Weight;
};

export type GenericContractQueryCall<_ extends GenericSubstrateApi, F extends AsyncMethod = AsyncMethod> = F & {
  meta: ContractMessage;
};

export type GenericContractTxCall<_ extends GenericSubstrateApi, F extends AnyFunc = AnyFunc> = F & {
  meta: ContractMessage;
};

export type GenericConstructorQueryCall<_ extends GenericSubstrateApi, F extends AsyncMethod = AsyncMethod> = F & {
  meta: ContractConstructorMessage;
};

export type GenericConstructorTxCall<_ extends GenericSubstrateApi, F extends AnyFunc = AnyFunc> = F & {
  meta: ContractConstructorMessage;
};

export interface GenericContractQuery<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericContractQueryCall<ChainApi>;
}

export interface GenericContractTx<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericContractTxCall<ChainApi>;
}

export interface GenericConstructorQuery<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericConstructorQueryCall<ChainApi>;
}

export interface GenericConstructorTx<ChainApi extends GenericSubstrateApi> {
  [method: string]: GenericConstructorTxCall<ChainApi>;
}

export interface GenericContractApi<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  query: GenericContractQuery<ChainApi>;
  tx: GenericContractTx<ChainApi>;
  constructorQuery: GenericConstructorQuery<ChainApi>;
  constructorTx: GenericConstructorTx<ChainApi>;
}
