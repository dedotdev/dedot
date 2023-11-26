import { ModuleError } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';

export type AsyncMethod = (...args: any[]) => Promise<any>;
export type Unsub = () => Promise<boolean>;
export type Callback<T> = (result: T) => Promise<void> | void;

export interface GenericModuleError {
  is: (moduleError: ModuleError) => boolean;
  meta: {
    name: string;
    fields: $.AnyShape[];
    index: number;
    docs: string[];
  };
  module: string;
}

export interface GenericRpcModule {
  [method: string]: AsyncMethod;
}

export interface GenericRpcCalls {
  [module: string]: GenericRpcModule;
}

export interface GenericChainConsts {
  [pallet: string]: {
    [constantName: string]: any;
  };
}

export interface GenericChainStorage {
  [pallet: string]: {
    [storageName: string]: AsyncMethod;
  };
}

export interface GenericChainErrors {
  [pallet: string]: {
    [errorName: string]: GenericModuleError;
  };
}

export interface GenericSubstrateApi {
  rpc: GenericRpcCalls;
  consts: GenericChainConsts;
  query: GenericChainStorage;
  errors: GenericChainErrors;

  // TODO tx, events, errors, calls ...
}
