import { AnyShape } from '@dedot/shape';

export type RpcParamSpec = {
  docs?: string;
  name: string;
  type: string;
  codec?: AnyShape;
  isScale?: boolean;
  isOptional?: boolean;
  [prop: string]: any;
};

export type RpcCallSpec = {
  name?: string;
  pubsub?: [subname: string, subscribe: string, unsubscribe: string];
  docs?: string | string[];
  deprecated?: string;
  alias?: string[];
  params: RpcParamSpec[];
  type: string;
  codec?: AnyShape;
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
