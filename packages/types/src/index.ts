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

export type GenericStorageQuery<
  Rv extends RpcVersion = RpcVersion,
  T extends AnyFunc = AnyFunc,
  KeyTypeOut extends any = undefined,
> = StorageQueryMethod<T> & {
  multi: StorageMultiQueryMethod<T>;
  meta: PalletStorageEntryMetadataLatest;
  rawKey: (...args: Parameters<T>) => StorageKey;
} & (KeyTypeOut extends undefined
    ? {}
    : Rv extends RpcLegacy
      ? {
          keys: (pagination?: PaginationOptions) => Promise<KeyTypeOut[]>;
          entries: (pagination?: PaginationOptions) => Promise<Array<[KeyTypeOut, NonNullable<ReturnType<T>>]>>;
        }
      : { entries: () => Promise<Array<[KeyTypeOut, NonNullable<ReturnType<T>>]>> });

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
  is: (event: PalletEvent) => event is PalletEvent<Pallet, EventName, Data>;
  as: (event: PalletEvent) => PalletEvent<Pallet, EventName, Data> | undefined;
  meta: PalletEventMetadataLatest;
}

export type GenericChainEvents<
  Rv extends RpcVersion = RpcVersion,
  Pallet extends string = string,
  EventName extends string = string,
  Data extends any = any,
> = Record<Pallet, Record<EventName, GenericPalletEvent<Rv, Pallet, EventName, Data>>>;

export interface GenericSubstrateApi<Rv extends RpcVersion = RpcVersion> {
  rpc: GenericJsonRpcApis<Rv>;
  consts: GenericChainConsts<Rv>;
  query: GenericChainStorage<Rv>;
  errors: GenericChainErrors<Rv>;
  events: GenericChainEvents<Rv>;
  call: GenericRuntimeApis<Rv>;
  tx: GenericChainTx<Rv>;
}

export interface VersionedGenericSubstrateApi {
  legacy: GenericSubstrateApi<RpcLegacy>;
  v2: GenericSubstrateApi<RpcV2>;
}
