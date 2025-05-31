import {
  InkContractCallMessage,
  InkContractConstructorMessage,
  InkContractEventArg,
  InkContractInformation,
  InkContractSource,
  InkContractStorage,
  InkContractType,
  InkContractTypeInfo,
} from './shared.js';

export interface InkContractMetadataV4 {
  source: InkContractSource;
  contract: InkContractInformation;
  spec: InkContractSpecV4;
  storage: InkContractStorage;
  types: InkContractType[];
  version: '4';
}

export interface InkContractSpecV4 {
  constructors: InkContractConstructorMessage[];
  docs: string[];
  environment: InkContractEnvironmentV4;
  events: InkContractEventV4[];
  lang_error: InkContractTypeInfo;
  messages: InkContractCallMessage[];
}

export interface InkContractEventV4 {
  args: InkContractEventArg[];
  docs: string[];
  label: string;
}

export interface InkContractEnvironmentV4 {
  accountId: InkContractTypeInfo;
  balance: InkContractTypeInfo;
  blockNumber: InkContractTypeInfo;
  chainExtension: InkContractTypeInfo;
  hash: InkContractTypeInfo;
  maxEventTopics: number;
  timestamp: InkContractTypeInfo;
}
