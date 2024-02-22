export type RuntimeApiMethodParamSpec = {
  name: string;
  type: string;
};

export type RuntimeApiMethodSpec = {
  docs?: string | string[];
  params: RuntimeApiMethodParamSpec[];
  type: string;
  runtimeApiName?: string;
  methodName?: string;
  version?: number;
  [prop: string]: any;
};

export type RuntimeApiSpec = {
  methods: RuntimeApiMethodsSpec;
  version: number;
  runtimeApiName?: string;
  moduleName?: string;
  runtimeApiHash?: string;
  [prop: string]: any;
};

export type RuntimeApiMethodName = string;

export type RuntimeApiName = string;

export type ModuleName = string;

export type RuntimeApiMethodsSpec = Record<RuntimeApiMethodName, RuntimeApiMethodSpec>;

export type RuntimeApisModule = Record<RuntimeApiName, RuntimeApiSpec[]>;

export type RuntimeApisSpec = Record<ModuleName, RuntimeApisModule>;
