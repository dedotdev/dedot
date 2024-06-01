import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32Like, BytesLike, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { ContractConstructorMessage, ContractMessage } from './shared.js';
import { ContractMetadataV4 } from './v4.js';
import { ContractMetadataV5 } from './v5.js';

export * from './shared.js';

export type GenericContractCallResult<DecodedData, ContractResult> =
  | {
      isOk: true;
      data: DecodedData;
      rawResult: ContractResult;
    }
  | {
      isOk: false;
      rawResult: ContractResult;
    };

export type ContractResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['call']>
>;

export type ConstructorResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['instantiate']>
>;

export type ChainSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['call']
>;

export type InstantiateWithCodeSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['instantiateWithCode']
>;

export type InstantiateSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['instantiate']
>;

export type GenericConstructorSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> =
  | InstantiateSubmittableExtrinsic<ChainApi>
  | InstantiateWithCodeSubmittableExtrinsic<ChainApi>;

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

export type GenericContractQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any[]) => Promise<GenericContractCallResult<unknown, ContractResult<ChainApi>>>,
> = F & {
  meta: ContractMessage;
};

export type GenericContractTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => ChainSubmittableExtrinsic<ChainApi>,
> = F & {
  meta: ContractMessage;
};

export type GenericConstructorQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any[]) => Promise<ConstructorResult<ChainApi>>,
> = F & {
  meta: ContractConstructorMessage;
};

export type GenericConstructorTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => GenericConstructorSubmittableExtrinsic<ChainApi>,
> = F & {
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
