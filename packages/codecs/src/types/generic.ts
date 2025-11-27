import { DispatchError, ModuleError, StorageKey } from '../codecs/index.js';
import {
  PalletErrorMetadataLatest,
  PalletEventMetadataLatest,
  PalletStorageEntryMetadataLatest,
  PalletTxMetadataLatest,
  PalletViewFunctionMetadataLatest,
} from '../metadata/index.js';
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

export interface GenericPalletError {
  is: (moduleError: ModuleError | DispatchError) => boolean;
  meta: PalletErrorMetadataLatest;
}

export interface GenericJsonRpcApis {
  [rpcName: string]: AsyncMethod;
}

export interface GenericChainConsts {
  [pallet: string]: {
    [constantName: string]: any;
  };
}

export interface GenericChainViewFunctions {
  [pallet: string]: {
    [viewFunction: string]: any;
  };
}

export type GenericViewFunction<F extends AnyFunc = AnyFunc> = F & {
  meta?: PalletViewFunctionMetadataLatest;
};

export type GenericTxCall<F extends AnyFunc = AnyFunc> = F & {
  meta?: PalletTxMetadataLatest;
};

export interface GenericChainTx<TxCall extends AnyFunc = AnyFunc> {
  [pallet: string]: {
    [callName: string]: GenericTxCall<TxCall>;
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
  T extends AnyFunc = AnyFunc,
  KeyTypeOut extends any = undefined,
> = StorageQueryMethod<T> & {
  /** Metadata for the storage entry including pallet name, storage name, and type information, ... */
  meta: PalletStorageEntryMetadataLatest;

  /** Get the raw storage key for the given arguments */
  rawKey: (...args: Parameters<T>) => StorageKey;
} & (KeyTypeOut extends undefined
    ? {}
    : {
        /** Query multiple storage entries in a single call */
        multi: StorageMultiQueryMethod<T>;

        /** Get storage keys in paginated form */
        pagedKeys: PagedKeysMethod<T, KeyTypeOut>;

        /** Get storage entries (key-value pairs) in paginated form */
        pagedEntries: PagedEntriesMethod<T, KeyTypeOut>;
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

export type GenericRuntimeApiMethod<F extends AsyncMethod = AsyncMethod> = F & {
  meta: RuntimeApiMethodSpec;
};

export interface GenericRuntimeApi {
  [method: string]: GenericRuntimeApiMethod;
}

export interface GenericRuntimeApis {
  [runtime: string]: GenericRuntimeApi;
}

export interface GenericChainStorage {
  [pallet: string]: {
    [storageName: string]: GenericStorageQuery;
  };
}

export interface GenericChainErrors {
  [pallet: string]: {
    [errorName: string]: GenericPalletError;
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
  Pallet extends string = string,
  EventName extends string = string,
  Data extends any = any,
> = Record<Pallet, Record<EventName, GenericPalletEvent<Pallet, EventName, Data>>>;

export interface GenericChainKnownTypes {
  Address: any;
  Signature: any;
  RuntimeCall: any;
  Extra: any[];
  AssetId: any;
  [TypeName: string]: any;
}

export interface GenericSubstrateApi {
  rpc: GenericJsonRpcApis;
  consts: GenericChainConsts;
  query: GenericChainStorage;
  errors: GenericChainErrors;
  events: GenericChainEvents;
  call: GenericRuntimeApis;
  view: GenericChainViewFunctions;
  tx: GenericChainTx;

  types: GenericChainKnownTypes;
}

export type QueryFnParams<F> =
  F extends GenericStorageQuery<infer T, any> // prettier-end-here
    ? Parameters<T>
    : never;

export type QueryFnResult<F> =
  F extends GenericStorageQuery<infer T, any> // prettier-end-here
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
