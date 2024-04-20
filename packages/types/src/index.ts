import {
  DispatchError,
  ModuleError,
  PalletErrorMetadataLatest,
  PalletEventMetadataLatest,
  PalletStorageEntryMetadataLatest,
  PalletTxMetadataLatest,
  StorageKey,
} from '@dedot/codecs';
import { RuntimeApiMethodSpec } from './runtime.js';

export * from './runtime.js';
export * from './extrinsic.js';
export * from './event.js';

export type Append<T extends readonly unknown[], V> = [...T, V];
export type AnyFunc = (...args: any[]) => any;
export type AsyncMethod<T = any> = (...args: any[]) => Promise<T>;
export type Unsub = () => Promise<void>;
export type Callback<T = any> = (result: T) => Promise<void> | void;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type Overwrite<T, U> = DistributiveOmit<T, keyof U> & U;

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

export type GenericStorageQuery<
  T extends AnyFunc = AnyFunc,
  KeyTypeIn extends any = undefined,
> = StorageQueryMethod<T> & {
  multi: StorageMultiQueryMethod<T>;
  meta: PalletStorageEntryMetadataLatest;
  rawKey: (...args: Parameters<T>) => StorageKey;
} & (KeyTypeIn extends undefined
    ? {}
    : {
        keys: (pagination?: PaginationOptions) => Promise<KeyTypeIn[]>;
        entries: (pagination?: PaginationOptions) => Promise<Array<[KeyTypeIn, NonNullable<ReturnType<T>>]>>;
      });

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
  is: (event: PalletEvent) => event is PalletEvent<Pallet, EventName, Data>;
  as: (event: PalletEvent) => PalletEvent<Pallet, EventName, Data> | undefined;
  meta: PalletEventMetadataLatest;
}

export type GenericChainEvents<
  Pallet extends string = string,
  EventName extends string = string,
  Data extends any = any,
> = Record<Pallet, Record<EventName, GenericPalletEvent<Pallet, EventName, Data>>>;

export interface GenericSubstrateApi {
  rpc: GenericJsonRpcApis;
  consts: GenericChainConsts;
  query: GenericChainStorage;
  errors: GenericChainErrors;
  events: GenericChainEvents;
  call: GenericRuntimeApis;
  tx: GenericChainTx;
}
