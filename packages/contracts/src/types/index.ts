import { SubstrateApi } from '@dedot/api/chaintypes';
import {
  AccountId32Like,
  type Bytes,
  BytesLike,
  type DispatchError,
  Extrinsic,
  type H256,
  type Result,
  Weight,
} from '@dedot/codecs';
import {
  AnyFunc,
  AsyncMethod,
  GenericSubstrateApi,
  IEventRecord,
  ISubmittableExtrinsic,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';
import { ContractAddress, ContractCallMessage, ContractConstructorMessage } from './shared.js';
import { ContractEventV4, ContractMetadataV4 } from './v4.js';
import { ContractEventV5, ContractMetadataV5 } from './v5.js';
import { ContractMetadataV6 } from './v6.js';

export * from './shared.js';
export * from './v4.js';
export * from './v5.js';
export * from './v6.js';

export type ContractEventMeta = ContractEventV4 | ContractEventV5;

/**
 * Flags used by a contract to customize exit behaviour.
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/d2fd53645654d3b8e12cbf735b67b93078d70113/substrate/frame/contracts/uapi/src/flags.rs#L23-L26
 */
export type ReturnFlags = {
  bits: number;
  revert: boolean; // 0x0000_0001
};

export interface GenericContractCallResult<DecodedData = any, ContractResult = any> {
  data: DecodedData;
  raw: ContractResult;
  flags: ReturnFlags;
  inputData: Bytes; // Encoded (selector + arguments) input data
}

export interface GenericConstructorCallResult<DecodedData = any, ContractResult = any>
  extends GenericContractCallResult<DecodedData, ContractResult> {
  address: ContractAddress; // Address of the contract will be instantiated
}

export type ContractCode = { type: 'Upload'; value: Bytes } | { type: 'Existing'; value: H256 };

export type WeightV2 = { refTime: bigint; proofSize: bigint };

export type StorageDeposit = { type: 'Refund'; value: bigint } | { type: 'Charge'; value: bigint };

export type ExecReturnValue = { flags: { bits: number }; data: Bytes };

export type InstantiateReturnValue = {
  result: ExecReturnValue;
  address: ContractAddress;
};

export type ContractCallResult<_ extends GenericSubstrateApi> = {
  gasConsumed: WeightV2;
  gasRequired: WeightV2;
  storageDeposit: StorageDeposit;
  debugMessage?: Bytes;
  result: Result<ExecReturnValue, DispatchError>;
};

export type ContractInstantiateResult<_ extends GenericSubstrateApi> = {
  gasConsumed: WeightV2;
  gasRequired: WeightV2;
  storageDeposit: StorageDeposit;
  debugMessage?: Bytes;
  result: Result<InstantiateReturnValue, DispatchError>;
};

type SubmittableExtrinsic = ISubmittableExtrinsic & Extrinsic;

export type ContractSubmittableExtrinsic<_ extends GenericSubstrateApi> = SubmittableExtrinsic;

export type GenericInstantiateSubmittableExtrinsic<_ extends GenericSubstrateApi> = SubmittableExtrinsic;

export type ContractMetadata = ContractMetadataV4 | ContractMetadataV5 | ContractMetadataV6;

export interface LooseContractMetadata {
  version: number | string;
  [prop: string]: any;
}

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

export type GenericInkLangError = 'CouldNotReadInput' | any;
export type GenericRootStorage = any;
export type GenericLazyStorage = any;

export interface GenericContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> {
  query: GenericContractQuery<ChainApi[Rv]>;
  tx: GenericContractTx<ChainApi[Rv]>;
  constructorQuery: GenericConstructorQuery<ChainApi[Rv]>;
  constructorTx: GenericConstructorTx<ChainApi[Rv]>;
  events: GenericContractEvents<ChainApi[Rv]>;
  storage: {
    root(): Promise<GenericRootStorage>;
    lazy(): GenericLazyStorage;
  };

  types: {
    RootStorage: GenericRootStorage;
    LazyStorage: GenericLazyStorage;
    LangError: GenericInkLangError;
    ChainApi: ChainApi[Rv];
  };
}

export interface ExecutionOptions {
  defaultCaller?: AccountId32Like;
}

// Utility: Detect if a type has a `.get(...)` method
type HasGetter<T> = T extends { get: (...args: any[]) => any } ? true : false;

// Recursive type: Keep props if they (or children) have `.get(...)`, preserve original type
export type WithLazyStorage<T> = {
  [K in keyof T as HasGetter<T[K]> extends true
    ? K
    : T[K] extends object
      ? keyof WithLazyStorage<T[K]> extends never
        ? never
        : K
      : never]: T[K] extends object
    ? HasGetter<T[K]> extends true
      ? T[K] // preserve full type if it has `.get(...)`
      : WithLazyStorage<T[K]> // recurse
    : never;
};
