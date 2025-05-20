import {
  ContractCallMessage,
  ContractConstructorMessage,
  ContractEventArg,
  ContractInformation,
  ContractSource,
  ContractType,
  ContractTypeInfo,
} from './shared.js';

export interface ContractMetadataV4 {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpecV4;
  storage: ContractStorageV4;
  types: ContractType[];
  version: '4';
}

export interface ContractSpecV4 {
  constructors: ContractConstructorMessage[];
  docs: string[];
  environment: ContractEnvironmentV4;
  events: ContractEventV4[];
  lang_error: ContractTypeInfo;
  messages: ContractCallMessage[];
}

export interface ContractEventV4 {
  args: ContractEventArg[];
  docs: string[];
  label: string;
}

export interface ContractEnvironmentV4 {
  accountId: ContractTypeInfo;
  balance: ContractTypeInfo;
  blockNumber: ContractTypeInfo;
  chainExtension: ContractTypeInfo;
  hash: ContractTypeInfo;
  maxEventTopics: number;
  timestamp: ContractTypeInfo;
}

interface StructLayoutV4 {
  name: string;
  fields: {
    name: string;
    layout: AnyLayoutV4;
  }[];
}

interface LeafLayoutV4 {
  key: string;
  ty: number;
}

interface HashLayoutV4 {
  // TODO support hash layout
}

interface ArrayLayoutV4 {
  offset: string;
  len: number;
  layout: AnyLayoutV4;
}

interface EnumLayoutV4 {
  name: string;
  dispatch_key: string;
  variants: Record<number, StructLayoutV4>;
}

interface RootLayoutV4 {
  root_key: string;
  layout: AnyLayoutV4;
}

export type AnyLayoutV4 = {
  struct: StructLayoutV4;
  leaf: LeafLayoutV4;
  hash: HashLayoutV4;
  array: ArrayLayoutV4;
  enum: EnumLayoutV4;
  root: RootLayoutV4;
};

export interface ContractStorageV4 {
  root: RootLayoutV4;
}
