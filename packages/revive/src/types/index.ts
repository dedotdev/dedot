import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32Like, BytesLike, H160, Weight } from '@dedot/codecs';
import {
  AnyFunc,
  AsyncMethod,
  GenericInkLangError,
  GenericSubstrateApi,
  IEventRecord,
  InkContractCallMessage,
  InkContractConstructorMessage,
  InkContractEventV5,
  InkContractMessage,
  InkContractMessageArg,
  InkContractMetadataV6,
  ReturnFlags,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';

export type ContractMetadata = InkContractMetadataV6;
export type ContractEventMeta = InkContractEventV5;
export type ContractCallMessage = InkContractCallMessage;
export type ContractConstructorMessage = InkContractConstructorMessage;
export type ContractMessage = InkContractMessage;
export type ContractMessageArg = InkContractMessageArg;

export interface GenericContractCallResult<DecodedData = any, ContractResult = any> {
  data: DecodedData;
  raw: ContractResult;
  flags: ReturnFlags;
}

export interface GenericConstructorCallResult<DecodedData = any, ContractResult = any>
  extends GenericContractCallResult<DecodedData, ContractResult> {
  address: H160; // Address of the contract will be instantiated
}

export type ContractCallResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['reviveApi']['call']>
>;

export type ContractInstantiateResult<ChainApi extends GenericSubstrateApi> = Awaited<
  ReturnType<ChainApi['call']['reviveApi']['instantiate']>
>;

export type ContractSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['revive']['call']
>;

export type InstantiateWithCodeSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['revive']['instantiateWithCode']
>;

export type InstantiateSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> = ReturnType<
  ChainApi['tx']['revive']['instantiate']
>;

export type GenericInstantiateSubmittableExtrinsic<ChainApi extends GenericSubstrateApi> =
  | InstantiateSubmittableExtrinsic<ChainApi>
  | InstantiateWithCodeSubmittableExtrinsic<ChainApi>;

export type CallOptions = {
  value?: bigint;
  gasLimit?: Weight | undefined;
  storageDepositLimit?: bigint | undefined;
};

export type ConstructorCallOptions = CallOptions & {
  salt?: BytesLike;
  caller?: AccountId32Like;
};

export type ConstructorTxOptions = CallOptions & {
  salt?: BytesLike;
  gasLimit: Weight;
};

export type ContractCallOptions = CallOptions & {
  caller?: AccountId32Like;
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
  F extends AsyncMethod = (
    ...args: any[]
  ) => Promise<GenericConstructorCallResult<any, ContractInstantiateResult<ChainApi>>>,
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
  is: (event: IEventRecord | ContractEvent) => event is ContractEvent<EventName, Data>;
  find: (events: IEventRecord[] | ContractEvent[]) => ContractEvent<EventName, Data> | undefined;
  filter: (events: IEventRecord[] | ContractEvent[]) => ContractEvent<EventName, Data>[];
  watch: (callback: (events: ContractEvent<EventName, Data>[]) => void) => Promise<Unsub>;
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

  types: {
    LangError: GenericInkLangError;
    ChainApi: ChainApi[Rv];
  };
}

export interface ExecutionOptions {
  defaultCaller?: AccountId32Like;
}
