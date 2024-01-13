export type RuntimeApiParamSpec = {
  name: string;
  type: string;
};

export type RuntimeApiSpec = {
  docs?: string | string[];
  params: RuntimeApiParamSpec[];
  type: string;
  runtime?: string;
  method?: string;
  version?: number;
  [prop: string]: any;
};

export type RuntimeSpec = {
  methods: RuntimeApis;
  version: number;
  runtime?: string;
  module?: string;
  [prop: string]: any;
};

export type RuntimeApis = Record<string, RuntimeApiSpec>;

export type RuntimeApisModule = Record<string, RuntimeSpec[]>;

export type RuntimeApisModules = Record<string, RuntimeApisModule>;
