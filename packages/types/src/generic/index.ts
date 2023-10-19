export type AsyncMethod = (...args: any[]) => Promise<any>;

export interface GenericRpcCalls {
  [pallet: string]: {
    [method: string]: AsyncMethod;
  };
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
