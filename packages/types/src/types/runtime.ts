export type RuntimeCallParamSpec = {
  name: string;
  type: string;
};

export type RuntimeCallSpec = {
  docs?: string | string[];
  params: RuntimeCallParamSpec[];
  type: string;
  runtimeApiName?: string;
  methodName?: string;
  version?: number;
  [prop: string]: any;
};

export type RuntimeApiSpec = {
  methods: RuntimeCalls;
  version: number;
  runtimeApiName?: string;
  moduleName?: string;
  runtimeApiHash?: string;
  [prop: string]: any;
};

export type RuntimeCalls = Record<string, RuntimeCallSpec>;

export type RuntimeApisModule = Record<string, RuntimeApiSpec[]>;

export type RuntimeApisModules = Record<string, RuntimeApisModule>;
