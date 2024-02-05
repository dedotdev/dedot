import {
  DispatchError,
  ModuleError,
  PalletErrorMetadataLatest,
  PalletEventMetadataLatest,
} from '@delightfuldot/codecs';
import { RpcCallSpec } from './rpc';
import { RuntimeCallSpec } from './runtime';

export * from './rpc';
export * from './runtime';
export * from './extrinsic';

export type Append<T extends readonly unknown[], V> = [...T, V];
export type AnyFunc = (...args: any[]) => any;
export type AsyncMethod = (...args: any[]) => Promise<any>;
export type Unsub = () => Promise<boolean>;
export type Callback<T> = (result: T) => Promise<void> | void;

export interface GenericPalletError {
  is: (moduleError: ModuleError | DispatchError) => boolean;
  meta: PalletErrorMetadataLatest;
}

export type GenericRpcCall<F extends AsyncMethod = AsyncMethod> = F & {
  meta?: RpcCallSpec;
};

export interface GenericRpcModule {
  [method: string]: GenericRpcCall;
}

export interface GenericRpcCalls {
  [module: string]: GenericRpcModule;
}

export interface GenericChainConsts {
  [pallet: string]: {
    [constantName: string]: any;
  };
}

export interface GenericChainTx {
  [pallet: string]: {
    [callName: string]: AnyFunc;
  };
}

export interface StorageQueryMethod<F extends AnyFunc = AnyFunc> {
  (...args: Parameters<F>): Promise<ReturnType<F>>;
  (...args: Append<Parameters<F>, Callback<ReturnType<F>>>): Promise<Unsub>;
}

export type GenericStorageQuery<T extends AnyFunc = AnyFunc> = StorageQueryMethod<T> & {};

export type GenericRuntimeCall<F extends AsyncMethod = AsyncMethod> = F & {
  meta: RuntimeCallSpec;
};

export interface GenericRuntime {
  [method: string]: GenericRuntimeCall;
}

export interface GenericRuntimeCalls {
  [runtime: string]: GenericRuntime;
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
  rpc: GenericRpcCalls;
  consts: GenericChainConsts;
  query: GenericChainStorage;
  errors: GenericChainErrors;
  events: GenericChainEvents;
  call: GenericRuntimeCalls;
  tx: GenericChainTx;
}
