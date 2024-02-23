import { TypeId } from '@delightfuldot/codecs';
import { AnyShape } from '@delightfuldot/shape';

export interface RuntimeApiMethodParamSpec {
  name: string;
  type?: string;
  typeId?: TypeId;
  codec?: AnyShape;
}

export interface RuntimeApiMethodSpec {
  docs?: string | string[];
  params: RuntimeApiMethodParamSpec[];
  type?: string;
  typeId?: TypeId;
  codec?: AnyShape;
  runtimeApiName?: string;
  methodName?: string;
  version?: number;
  [prop: string]: any;
}

export interface RuntimeApiSpec {
  methods: RuntimeApiMethodsSpec;
  version: number;
  runtimeApiName?: string;
  runtimeApiHash?: string;
  [prop: string]: any;
}

export type RuntimeApiMethodName = string;

export type RuntimeApiName = string;

export type ModuleName = string;

export type RuntimeApiMethodsSpec = Record<RuntimeApiMethodName, RuntimeApiMethodSpec>;

export type RuntimeApisModule = Record<RuntimeApiName, RuntimeApiSpec[]>;

export type RuntimeApisSpec = Record<ModuleName, RuntimeApisModule>;
