import { SubstrateApi } from '@dedot/api/chaintypes';
import {
  AnyFunc,
  AsyncMethod,
  GenericSubstrateApi,
  IEventRecord,
  ISubmittableResult,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/types';
import { Contract } from '../../Contract.js';
import {
  ContractCallResult,
  ContractInstantiateResult,
  ContractSubmittableExtrinsic,
  ExecutionOptions,
  GenericConstructorCallResult,
  GenericContractCallResult,
  SubmittableExtrinsic,
} from '../shared.js';
import { ContractAddress, ContractCallMessage, ContractConstructorMessage } from './shared.js';
import { ContractEventV4, ContractMetadataV4 } from './v4.js';
import { ContractEventV5, ContractMetadataV5 } from './v5.js';
import { ContractMetadataV6 } from './v6.js';

export * from './shared.js';
export * from './v4.js';
export * from './v5.js';
export * from './v6.js';

export type ContractEventMeta = ContractEventV4 | ContractEventV5;

export interface IContractInstantiateSubmittableResult<
  ContractApi extends GenericContractApi = GenericContractApi, // --
> extends ISubmittableResult {
  /**
   * Get deployed contract address
   */
  contractAddress(): Promise<ContractAddress>;

  /**
   * Get deployed contract instance
   */
  contract(options?: ExecutionOptions): Promise<Contract<ContractApi>>;
}

export type GenericInstantiateSubmittableExtrinsic<
  _ extends GenericSubstrateApi,
  ContractApi extends GenericContractApi = GenericContractApi,
> = SubmittableExtrinsic<IContractInstantiateSubmittableResult<ContractApi>>;

export type ContractMetadata = ContractMetadataV4 | ContractMetadataV5 | ContractMetadataV6;

export interface LooseContractMetadata {
  version: number | string;
  [prop: string]: any;
}

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
