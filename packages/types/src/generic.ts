import {
  DispatchError,
  ModuleError,
  PalletErrorMetadataLatest,
  PalletEventMetadataLatest,
  PalletStorageEntryMetadataLatest,
  PalletTxMetadataLatest,
  PalletViewFunctionMetadataLatest,
  StorageKey,
} from '@dedot/codecs';
import { IEventRecord } from './event.js';
import { RuntimeApiMethodSpec } from './runtime.js';

export type Append<T extends readonly unknown[], V> = [...T, V];
export type AnyFunc = (...args: any[]) => any;
export type AsyncMethod<T = any> = (...args: any[]) => Promise<T>;
export type Unsub = () => Promise<void>;
export type Callback<T = any> = (result: T) => Promise<void> | void;

export type RpcLegacy = 'legacy';
export type RpcV2 = 'v2';
export type RpcVersion = RpcLegacy | RpcV2;

export interface GenericPalletError<_ extends RpcVersion = RpcVersion> {
  is: (moduleError: ModuleError | DispatchError) => boolean;
  meta: PalletErrorMetadataLatest;
}

export interface GenericJsonRpcApis<_ extends RpcVersion = RpcVersion> {
  [rpcName: string]: AsyncMethod;
}

export interface GenericChainConsts<_ extends RpcVersion = RpcVersion> {
  [pallet: string]: {
    [constantName: string]: any;
  };
}

export interface GenericChainViewFunctions<_ extends RpcVersion = RpcVersion> {
  [pallet: string]: {
    [viewFunction: string]: any;
  };
}

export type GenericViewFunction<_ extends RpcVersion = RpcVersion, F extends AnyFunc = AnyFunc> = F & {
  meta?: PalletViewFunctionMetadataLatest;
};

export type GenericTxCall<_ extends RpcVersion = RpcVersion, F extends AnyFunc = AnyFunc> = F & {
  meta?: PalletTxMetadataLatest;
};

export interface GenericChainTx<Rv extends RpcVersion = RpcVersion, TxCall extends AnyFunc = AnyFunc> {
  [pallet: string]: {
    [callName: string]: GenericTxCall<Rv, TxCall>;
  };
}

export interface StorageQueryMethod<F extends AnyFunc = AnyFunc> {
  (...args: Parameters<F>): Promise<ReturnType<F>>;
  (...args: Append<Parameters<F>, Callback<ReturnType<F>>>): Promise<Unsub>;
}

export interface StorageMultiQueryMethod<F extends AnyFunc = AnyFunc> {
  (args: Array<Parameters<F>[0]>): Promise<Array<ReturnType<F>>>;
  (args: Array<Parameters<F>[0]>, callback: Callback<Array<ReturnType<F>>>): Promise<Unsub>;
}

export interface PaginationOptions {
  pageSize?: number;
  startKey?: StorageKey;
}

interface PagedKeysMethod<T extends AnyFunc = AnyFunc, TypeOut extends any = any> {
  (...args: WithPagination<Parameters<T>[0]>): Promise<TypeOut[]>;
  (pagination?: PaginationOptions): Promise<TypeOut[]>;
}

interface PagedEntriesMethod<T extends AnyFunc = AnyFunc, TypeOut extends any = any> {
  (...args: WithPagination<Parameters<T>[0]>): Promise<Array<[TypeOut, NonNullable<ReturnType<T>>]>>;
  (pagination?: PaginationOptions): Promise<Array<[TypeOut, NonNullable<ReturnType<T>>]>>;
}

export type WithoutLast<T> = T extends any[] ? (T extends [...infer U, any] ? U : T) : T;

export type WithPagination<T> = T extends any[]
  ? [...PartialParams<WithoutLast<T>>, pagination?: PaginationOptions]
  : [pagination?: PaginationOptions];

export type PartialParams<T> = T extends readonly [...infer Params]
  ? Params extends readonly []
    ? []
    : Params extends readonly [infer P1]
      ? [P1?]
      : Params extends readonly [infer P1, infer P2]
        ? [P1?] | [P1, P2?]
        : Params extends readonly [infer P1, infer P2, infer P3]
          ? [P1?] | [P1, P2?] | [P1, P2, P3?]
          : Params extends readonly [infer P1, infer P2, infer P3, infer P4]
            ? [P1?] | [P1, P2?] | [P1, P2, P3?] | [P1, P2, P3, P4?]
            : Params extends readonly [infer P1, infer P2, infer P3, infer P4, infer P5]
              ? [P1?] | [P1, P2?] | [P1, P2, P3?] | [P1, P2, P3, P4?] | [P1, P2, P3, P4, P5?]
              : Params extends readonly [infer P1, infer P2, infer P3, infer P4, infer P5, infer P6]
                ?
                    | [P1?]
                    | [P1, P2?]
                    | [P1, P2, P3?]
                    | [P1, P2, P3, P4?]
                    | [P1, P2, P3, P4, P5?]
                    | [P1, P2, P3, P4, P5, P6?]
                : Partial<Params>
  : [];

/**
 * @description A generic type for storage query methods that handles both single and map (double & n-th map) storage entries
 */
export type GenericStorageQuery<
  Rv extends RpcVersion = RpcVersion,
  T extends AnyFunc = AnyFunc,
  KeyTypeOut extends any = undefined,
> = StorageQueryMethod<T> & {
  /** Metadata for the storage entry including pallet name, storage name, and type information, ... */
  meta: PalletStorageEntryMetadataLatest;

  /** Get the raw storage key for the given arguments */
  rawKey: (...args: Parameters<T>) => StorageKey;
} & (KeyTypeOut extends undefined
    ? {}
    : Rv extends RpcLegacy
      ? {
          /** Query multiple storage entries in a single call */
          multi: StorageMultiQueryMethod<T>;

          /** Get storage keys in paginated form */
          pagedKeys: PagedKeysMethod<T, KeyTypeOut>;

          /** Get storage entries (key-value pairs) in paginated form */
          pagedEntries: PagedEntriesMethod<T, KeyTypeOut>;
        }
      : {
          /** Query multiple storage entries in a single call */
          multi: StorageMultiQueryMethod<T>;
        } & (KeyTypeOut extends any[]
          ? {
              /** Get all storage entries, allowing partial keys input */
              entries: (
                ...args: PartialParams<WithoutLast<Parameters<T>[0]>>
              ) => Promise<Array<[KeyTypeOut, NonNullable<ReturnType<T>>]>>;
            }
          : {
              /** Get all storage entries */
              entries: () => Promise<Array<[KeyTypeOut, NonNullable<ReturnType<T>>]>>;
            }));
// TODO support pagedKeys, pagedEntries via archive-prefix apis

export type GenericRuntimeApiMethod<_ extends RpcVersion = RpcVersion, F extends AsyncMethod = AsyncMethod> = F & {
  meta: RuntimeApiMethodSpec;
};

export interface GenericRuntimeApi<Rv extends RpcVersion = RpcVersion> {
  [method: string]: GenericRuntimeApiMethod<Rv>;
}

export interface GenericRuntimeApis<Rv extends RpcVersion = RpcVersion> {
  [runtime: string]: GenericRuntimeApi<Rv>;
}

export interface GenericChainStorage<Rv extends RpcVersion = RpcVersion> {
  [pallet: string]: {
    [storageName: string]: GenericStorageQuery<Rv>;
  };
}

export interface GenericChainErrors<Rv extends RpcVersion = RpcVersion> {
  [pallet: string]: {
    [errorName: string]: GenericPalletError<Rv>;
  };
}

export interface PalletEvent<
  Pallet extends string = string,
  EventName extends string = string,
  Data extends any = any,
> {
  pallet: Pallet;
  palletEvent: Data extends undefined
    ? EventName
    : Data extends null
      ? { name: EventName }
      : {
          name: EventName;
          data: Data;
        };
}

export interface GenericPalletEvent<
  _ extends RpcVersion = RpcVersion,
  Pallet extends string = string,
  EventName extends string = string,
  Data extends any = any,
> {
  is: (event: IEventRecord | PalletEvent) => event is PalletEvent<Pallet, EventName, Data>;
  find: (events: IEventRecord[] | PalletEvent[]) => PalletEvent<Pallet, EventName, Data> | undefined;
  filter: (events: IEventRecord[] | PalletEvent[]) => PalletEvent<Pallet, EventName, Data>[];
  watch: (callback: (events: PalletEvent<Pallet, EventName, Data>[]) => void) => Promise<Unsub>;
  meta: PalletEventMetadataLatest;
}

export type GenericChainEvents<
  Rv extends RpcVersion = RpcVersion,
  Pallet extends string = string,
  EventName extends string = string,
  Data extends any = any,
> = Record<Pallet, Record<EventName, GenericPalletEvent<Rv, Pallet, EventName, Data>>>;

export type GenericAddress = any;
export type GenericSignature = any;
export type GenericRuntimeCall = any;
export type GenericExtra = any[];

export interface GenericSubstrateApi<Rv extends RpcVersion = RpcVersion> {
  rpc: GenericJsonRpcApis<Rv>;
  consts: GenericChainConsts<Rv>;
  query: GenericChainStorage<Rv>;
  errors: GenericChainErrors<Rv>;
  events: GenericChainEvents<Rv>;
  call: GenericRuntimeApis<Rv>;
  view: GenericChainViewFunctions<Rv>;
  tx: GenericChainTx<Rv>;
  
  types: {
    Address: GenericAddress;
    Signature: GenericSignature;
    RuntimeCall: GenericRuntimeCall;
    Extra: GenericExtra;
  };
}

export interface VersionedGenericSubstrateApi {
  legacy: GenericSubstrateApi<RpcLegacy>;
  v2: GenericSubstrateApi<RpcV2>;
}

export type QueryFnParams<F> =
  F extends GenericStorageQuery<any, infer T, any> // prettier-end-here
    ? Parameters<T>
    : never;

export type QueryFnResult<F> =
  F extends GenericStorageQuery<any, infer T, any> // prettier-end-here
    ? ReturnType<T>
    : never;

export type QueryWithParams<F> = {
  fn: F;
  args: QueryFnParams<F>;
};

export type QueryWithoutParams<F> = {
  fn: F;
  args?: [];
};

export type Query<F> =
  QueryFnParams<F> extends [] // prettier-end-here
    ? QueryWithoutParams<F>
    : QueryWithParams<F>;
