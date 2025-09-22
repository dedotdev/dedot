import { SubstrateApi } from '@dedot/api/chaintypes';
import {
  AnyFunc,
  AsyncMethod,
  GenericSubstrateApi,
  IEventRecord,
  RpcVersion,
  Unsub,
  VersionedGenericSubstrateApi,
} from '@dedot/codecs/types';
import { ISubmittableResult } from '@dedot/types';
import { Contract } from '../Contract';
import { SolRegistry } from '../SolRegistry';
import { TypinkRegistry } from '../TypinkRegistry';
import { ContractCallMessage, ContractConstructorMessage, ContractEventMeta, ContractMetadata } from './ink';
import {
  ContractAddress,
  ContractCallResult,
  ContractInstantiateResult,
  ContractSubmittableExtrinsic,
  ExecutionOptions,
  GenericConstructorCallResult,
  GenericContractCallResult,
  SubmittableExtrinsic,
} from './shared';
import { SolABIConstructor, SolABIEvent, SolABIFunction, SolABIItem } from './sol';

export * from './ink/index.js';
export * from './sol/index.js';
export * from './shared.js';

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

export interface LooseContractMetadata {
  version: number | string;

  [prop: string]: any;
}

export type GenericContractQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (...args: any[]) => Promise<GenericContractCallResult<any, ContractCallResult<ChainApi>>>,
  Type extends MetadataType = 'ink',
> = F & {
  meta: Type extends 'ink' ? ContractCallMessage : SolABIFunction;
};

export type GenericContractTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => ContractSubmittableExtrinsic<ChainApi>,
  Type extends MetadataType = 'ink',
> = F & {
  meta: Type extends 'ink' ? ContractCallMessage : SolABIFunction;
};

export type GenericConstructorQueryCall<
  ChainApi extends GenericSubstrateApi,
  F extends AsyncMethod = (
    ...args: any[]
  ) => Promise<GenericConstructorCallResult<any, ContractInstantiateResult<ChainApi>>>,
  Type extends MetadataType = 'ink',
> = F & {
  meta: Type extends 'ink' ? ContractConstructorMessage : SolABIConstructor;
};

export type GenericConstructorTxCall<
  ChainApi extends GenericSubstrateApi,
  F extends AnyFunc = (...args: any[]) => GenericInstantiateSubmittableExtrinsic<ChainApi>,
  Type extends MetadataType = 'ink',
> = F & {
  meta: Type extends 'ink' ? ContractConstructorMessage : SolABIConstructor;
};

export interface GenericContractQuery<ChainApi extends GenericSubstrateApi, Type extends MetadataType> {
  [method: string]: GenericContractQueryCall<
    ChainApi,
    (...args: any[]) => Promise<GenericContractCallResult<any, ContractCallResult<ChainApi>>>,
    Type
  >;
}

export interface GenericContractTx<ChainApi extends GenericSubstrateApi, Type extends MetadataType> {
  [method: string]: GenericContractTxCall<ChainApi, (...args: any[]) => ContractSubmittableExtrinsic<ChainApi>, Type>;
}

export interface GenericConstructorQuery<ChainApi extends GenericSubstrateApi, Type extends MetadataType> {
  [method: string]: GenericConstructorQueryCall<
    ChainApi,
    (...args: any[]) => Promise<GenericConstructorCallResult<any, ContractInstantiateResult<ChainApi>>>,
    Type
  >;
}

export interface GenericConstructorTx<ChainApi extends GenericSubstrateApi, Type extends MetadataType> {
  [method: string]: GenericConstructorTxCall<
    ChainApi,
    (...args: any[]) => GenericInstantiateSubmittableExtrinsic<ChainApi>,
    Type
  >;
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
  Type extends MetadataType = 'ink',
> {
  is: (event: IEventRecord | ContractEvent) => event is ContractEvent<EventName, Data>;
  find: (events: IEventRecord[] | ContractEvent[]) => ContractEvent<EventName, Data> | undefined;
  filter: (events: IEventRecord[] | ContractEvent[]) => ContractEvent<EventName, Data>[];
  watch: (callback: (events: ContractEvent<EventName, Data>[]) => void) => Promise<Unsub>;
  meta: Type extends 'ink' ? ContractEventMeta : SolABIEvent;
}

export interface GenericContractEvents<_ extends GenericSubstrateApi, Type extends MetadataType> {
  [event: string]: GenericContractEvent<string, any, Type>;
}

export type GenericInkLangError = 'CouldNotReadInput' | any;
export type GenericRootStorage = any;
export type GenericLazyStorage = any;
export type MetadataType = 'ink' | 'sol';

export interface GenericContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  Type extends MetadataType = MetadataType,
> {
  query: GenericContractQuery<ChainApi[Rv], Type>;
  tx: GenericContractTx<ChainApi[Rv], Type>;
  constructorQuery: GenericConstructorQuery<ChainApi[Rv], Type>;
  constructorTx: GenericConstructorTx<ChainApi[Rv], Type>;
  events: GenericContractEvents<ChainApi[Rv], Type>;
  storage: Type extends 'ink'
    ? {
        root(): Promise<GenericRootStorage>;
        lazy(): GenericLazyStorage;
      }
    : never;

  types: {
    Registry: Type extends 'ink' ? TypinkRegistry : SolRegistry;
    Metadata: Type extends 'ink' ? ContractMetadata : SolABIItem[];
    ChainApi: ChainApi[Rv];
  } & (Type extends 'ink'
    ? {
        RootStorage: Type extends 'ink' ? GenericRootStorage : never;
        LazyStorage: Type extends 'ink' ? GenericLazyStorage : never;
        LangError: Type extends 'ink' ? GenericInkLangError : never;
      }
    : {});
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

export interface SolGenericContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi, 'sol'> {}

export interface InkGenericContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi, 'ink'> {}
