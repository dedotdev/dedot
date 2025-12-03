import { SubstrateApi } from '@dedot/api/chaintypes';
import { Extrinsic } from '@dedot/codecs';
import {
  AnyFunc,
  AsyncMethod,
  GenericSubstrateApi,
  IEventRecord,
  ISubmittableExtrinsic,
  ISubmittableResult,
  Unsub,
} from '@dedot/types';
import { Contract } from '../Contract.js';
import { ContractCallMessage, ContractConstructorMessage, ContractEventMeta } from './ink/index.js';
import {
  ContractCallResult,
  ContractInstantiateResult,
  ExecutionOptions,
  GenericConstructorCallResult,
  GenericContractCallResult,
  ContractAddress,
} from './shared.js';
import { SolAbiConstructor, SolAbiEvent, SolAbiFunction } from './sol/index.js';

export * from './ink/index.js';
export * from './sol/index.js';
export * from './shared.js';

export type ContractSubmittableExtrinsic<
  R extends ISubmittableResult = ISubmittableResult, // --
> = ISubmittableExtrinsic<R> & Extrinsic;

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
  ContractApi extends GenericContractApi = GenericContractApi, // --
> = ContractSubmittableExtrinsic<IContractInstantiateSubmittableResult<ContractApi>>;

export interface LooseContractMetadata {
  version: number | string;

  [prop: string]: any;
}

export type LooseSolAbi = Array<{ type: string; [prop: string]: any }>;

export type GenericContractQueryCall<
  F extends AsyncMethod = (...args: any[]) => Promise<GenericContractCallResult<any, ContractCallResult>>,
  Type extends MetadataType = MetadataType,
> = F & {
  meta: Type extends 'ink' ? ContractCallMessage : SolAbiFunction;
};

export type GenericContractTxCall<
  F extends AnyFunc = (...args: any[]) => ContractSubmittableExtrinsic,
  Type extends MetadataType = MetadataType,
> = F & {
  meta: Type extends 'ink' ? ContractCallMessage : SolAbiFunction;
};

export type GenericConstructorQueryCall<
  F extends AsyncMethod = (...args: any[]) => Promise<GenericConstructorCallResult<any, ContractInstantiateResult>>,
  Type extends MetadataType = MetadataType,
> = F & {
  meta: Type extends 'ink' ? ContractConstructorMessage : SolAbiConstructor;
};

export type GenericConstructorTxCall<
  F extends AnyFunc = (...args: any[]) => GenericInstantiateSubmittableExtrinsic,
  Type extends MetadataType = MetadataType,
> = F & {
  meta: Type extends 'ink' ? ContractConstructorMessage : SolAbiConstructor;
};

export interface GenericContractQuery<Type extends MetadataType = MetadataType> {
  [method: string]: GenericContractQueryCall<
    (...args: any[]) => Promise<GenericContractCallResult<any, ContractCallResult>>,
    Type
  >;
}

export interface GenericContractTx<Type extends MetadataType = MetadataType> {
  [method: string]: GenericContractTxCall<(...args: any[]) => ContractSubmittableExtrinsic, Type>;
}

export interface GenericConstructorQuery<Type extends MetadataType = MetadataType> {
  [method: string]: GenericConstructorQueryCall<
    (...args: any[]) => Promise<GenericConstructorCallResult<any, ContractInstantiateResult>>,
    Type
  >;
}

export interface GenericConstructorTx<Type extends MetadataType = MetadataType> {
  [method: string]: GenericConstructorTxCall<(...args: any[]) => GenericInstantiateSubmittableExtrinsic, Type>;
}

export type ContractEvent<EventName extends string = string, Data extends any = any> = Data extends undefined
  ? {
      name: EventName;
    }
  : {
      name: EventName;
      data: Data;
    };

export interface GenericContractEvent<
  EventName extends string = string,
  Data extends any = any,
  Type extends MetadataType = MetadataType,
> {
  is: (event: IEventRecord | ContractEvent) => event is ContractEvent<EventName, Data>;
  find: (events: IEventRecord[] | ContractEvent[]) => ContractEvent<EventName, Data> | undefined;
  filter: (events: IEventRecord[] | ContractEvent[]) => ContractEvent<EventName, Data>[];
  watch: (callback: (events: ContractEvent<EventName, Data>[]) => void) => Promise<Unsub>;
  meta: Type extends 'ink' ? ContractEventMeta : SolAbiEvent;
}

export interface GenericContractEvents<Type extends MetadataType = MetadataType> {
  [event: string]: GenericContractEvent<string, any, Type>;
}

export type GenericInkLangError = 'CouldNotReadInput' | any;
export type GenericRootStorage = any;
export type GenericLazyStorage = any;
export type MetadataType = 'ink' | 'sol';

export type AB<Type extends MetadataType, A, B> = Type extends 'ink' ? A : B;

export interface GenericContractApi<
  ChainApi extends GenericSubstrateApi = SubstrateApi,
  Type extends MetadataType = MetadataType,
> {
  metadataType: Type;
  query: GenericContractQuery<Type>;
  tx: GenericContractTx<Type>;
  constructorQuery: GenericConstructorQuery<Type>;
  constructorTx: GenericConstructorTx<Type>;
  events: GenericContractEvents<Type>;
  storage: AB<
    Type,
    {
      root(): Promise<GenericRootStorage>;
      lazy(): GenericLazyStorage;
    },
    undefined
  >;

  types: {
    ChainApi: ChainApi;

    [TypeName: string]: any;
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

export interface InkGenericContractApi<
  ChainApi extends GenericSubstrateApi = SubstrateApi, //--
> extends GenericContractApi<ChainApi, 'ink'> {}

export interface SolGenericContractApi<
  ChainApi extends GenericSubstrateApi = SubstrateApi, // --
> extends GenericContractApi<ChainApi, 'sol'> {}
