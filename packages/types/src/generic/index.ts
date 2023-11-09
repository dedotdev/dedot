export type AsyncMethod = (...args: any[]) => Promise<any>;
export type Unsub = () => Promise<boolean>;
export type Callback<T> = (result: T) => void;

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

export interface GenericSubstrateApi {
  rpc: GenericRpcCalls;
  consts: GenericChainConsts;
  query: GenericChainStorage;

  // TODO tx, events, errors, calls ...
}
