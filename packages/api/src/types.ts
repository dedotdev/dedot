export interface RpcCalls {
  [pallet: string]: {
    [method: string]: (...args: unknown[]) => Promise<any>;
  };
}

export interface ChainConsts {
  [pallet: string]: {
    [name: string]: any;
  };
}

export interface ChainStorage {
  [pallet: string]: {
    [name: string]: any;
  };
}
