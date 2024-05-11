import {
  ContractConstructor,
  ContractInformation,
  ContractMessage,
  ContractSource,
  ContractStorage,
  ContractType,
  ContractTypeInfo,
} from './shared.js';

export interface ContractMetadataV4 {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpecV4;
  storage: ContractStorage;
  types: ContractType[];
  version: '4';
}

export interface ContractSpecV4 {
  constructors: ContractConstructor[];
  docs: string[];
  environment: ContractEnvironmentV4;
  events: ContractEventV4[];
  langError: ContractTypeInfo;
  messages: ContractMessage[];
}

export interface ContractEventV4 {
  args: unknown[];
  docs: string[];
  label: string[];
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
