import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32Like, BytesLike, Weight } from '@dedot/codecs';
import { AnyFunc, AsyncMethod, GenericSubstrateApi, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { ContractCallMessage, ContractConstructorMessage } from './shared.js';
import { ContractEventV4, ContractMetadataV4 } from './v4.js';
import { ContractEventV5, ContractMetadataV5 } from './v5.js';

export * from './shared.js';

export type ContractEventMeta = ContractEventV4 | ContractEventV5;

export type GenericContractCallResult<DecodedData, ContractResult> = {
  data: DecodedData;
  raw: ContractResult;
};

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

export type ContractEvent<EventName extends string = string, Data extends any = any> = Data extends undefined
  ? {
      name: EventName;
    }
  : {
      name: EventName;
      data: Data;
    };

export interface GenericContractEvent<EventName extends string = string, Data extends any = any> {
  is: (event: ContractEvent) => event is ContractEvent<EventName, Data>;
  as: (event: ContractEvent) => ContractEvent<EventName, Data> | undefined;
  meta: ContractEventMeta;
}

export interface GenericContractEvents<_ extends GenericSubstrateApi> {
  [event: string]: GenericContractEvent;
}

export interface GenericContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> {
  query: GenericContractQuery<ChainApi[Rv]>;
  tx: GenericContractTx<ChainApi[Rv]>;
  constructorQuery: GenericConstructorQuery<ChainApi[Rv]>;
  constructorTx: GenericConstructorTx<ChainApi[Rv]>;
  events: GenericContractEvents<ChainApi[Rv]>;
}
