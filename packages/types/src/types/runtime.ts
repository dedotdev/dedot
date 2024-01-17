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
  methods: RuntimeCallsSpec;
  version: number;
  runtimeApiName?: string;
  moduleName?: string;
  runtimeApiHash?: string;
  [prop: string]: any;
};

export type RuntimeCallName = string;

export type RuntimeApiName = string;

export type ModuleName = string;

export type RuntimeCallsSpec = Record<RuntimeCallName, RuntimeCallSpec>;

export type RuntimeApisModule = Record<RuntimeApiName, RuntimeApiSpec[]>;

export type RuntimeApisSpec = Record<ModuleName, RuntimeApisModule>;
