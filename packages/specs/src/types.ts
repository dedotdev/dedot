export type RpcParamSpec = {
  docs?: string;
  name: string;
  type: string;
  isScale?: boolean;
  isOptional?: boolean;
  [prop: string]: any;
};

export type RpcCallSpec = {
  name?: string;
  docs?: string | string[];
  alias?: string[];
  params: RpcParamSpec[];
  type: string;
  isScale?: boolean;
  isUnsafe?: boolean;
  module?: string;
  method?: string;
  [prop: string]: any;
};

export type RpcCallName = string;

export type RpcModuleName = string;

export type RpcModuleSpec = Record<RpcCallName, RpcCallSpec>;

export type RpcCallsSpec = Record<RpcModuleName, RpcModuleSpec>;
