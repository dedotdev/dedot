import { TypeId } from '@dedot/codecs';
import { AnyShape } from '@dedot/shape';

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

export type RuntimeApiMethodsSpec = Record<RuntimeApiMethodName, RuntimeApiMethodSpec>;
