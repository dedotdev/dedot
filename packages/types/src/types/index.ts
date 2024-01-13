import { Field, ModuleError } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';
import { RpcCallSpec } from './rpc';
import { RuntimeApiSpec } from './runtime';

export * from './rpc';
export * from './runtime';

export type Append<T extends readonly unknown[], V> = [...T, V];
export type AnyFunc = (...args: any[]) => any;
export type AsyncMethod = (...args: any[]) => Promise<any>;
export type Unsub = () => Promise<boolean>;
export type Callback<T> = (result: T) => Promise<void> | void;

export interface PalletItemMetadata {
  pallet: string;
  palletIndex: number;
  name: string;
  fields: Field[];
  fieldCodecs: $.AnyShape[];
  index: number;
  docs: string[];
}

export interface PalletErrorMetadataV14 extends PalletItemMetadata {}
export interface PalletEventMetadataV14 extends PalletItemMetadata {}
export interface PalletErrorMetadataLatest extends PalletErrorMetadataV14 {}
export interface PalletEventMetadataLatest extends PalletEventMetadataV14 {}

export interface GenericPalletError {
  is: (moduleError: ModuleError) => boolean;
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

export interface StorageQueryMethod<F extends AnyFunc = AnyFunc> {
  (...args: Parameters<F>): Promise<ReturnType<F>>;
  (...args: Append<Parameters<F>, Callback<ReturnType<F>>>): Promise<Unsub>;
}

export type GenericStorageQuery<T extends AnyFunc = AnyFunc> = StorageQueryMethod<T> & {};

export type GenericRuntimeCall<F extends AsyncMethod = AsyncMethod> = F & {
  meta: RuntimeApiSpec;
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

  // TODO tx, calls ...
}
