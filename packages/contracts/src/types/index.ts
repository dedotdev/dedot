import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32Like, BytesLike, DispatchError, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { ContractConstructorMessage, ContractCallMessage } from './shared.js';
import { ContractMetadataV4 } from './v4.js';
import { ContractMetadataV5 } from './v5.js';

export * from './shared.js';

export type GenericContractCallResult<DecodedData, ContractResult> = (
  | {
      isOk: true;
      data: DecodedData;
    }
  | {
      isOk: false;
      err: DispatchError;
    }
) & { raw: ContractResult };

export type ContractCallResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['call']>
>;

export type ContractInstantiateResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['contractsApi']['instantiate']>
>;

export type ContractSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['call']
>;

export type InstantiateWithCodeSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['instantiateWithCode']
>;

export type InstantiateSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['contracts']['instantiate']
>;

export type GenericInstantiateSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> =
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
  F extends AsyncMethod = (...args: any[]) => Promise<GenericContractCallResult<any, ContractCallResult<ChainApi>>>,
> = F & {
  meta: ContractCallMessage;
};

export type GenericContractTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => ContractSubmittableExtrinsic<ChainApi>,
> = F & {
  meta: ContractCallMessage;
};

export type GenericConstructorQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any[]) => Promise<ContractInstantiateResult<ChainApi>>,
> = F & {
  meta: ContractConstructorMessage;
};

export type GenericConstructorTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => GenericInstantiateSubmittableExtrinsic<ChainApi>,
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

export interface GenericContractApi<ChainApi extends VersionedGenericSubstrateApi = SubstrateApi> {
  query: GenericContractQuery<ChainApi[RpcVersion]>;
  tx: GenericContractTx<ChainApi[RpcVersion]>;
  constructorQuery: GenericConstructorQuery<ChainApi[RpcVersion]>;
  constructorTx: GenericConstructorTx<ChainApi[RpcVersion]>;
}
