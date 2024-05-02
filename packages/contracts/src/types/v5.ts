import {
  ContractConstructor,
  ContractInformation,
  ContractMessage,
  ContractSource,
  ContractStorage,
  ContractType,
  ContractTypeInfo,
} from './shared.js';

export interface ContractMetadataV5 {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpecV5;
  storage: ContractStorage;
  types: ContractType[];
  version: '5';
}

export interface ContractSpecV5 {
  constructors: ContractConstructor[];
  docs: string[];
  environment: ContractEnvironmentV5;
  events: ContractEventV5[];
  langError: ContractTypeInfo;
  messages: ContractMessage[];
}

export interface ContractEventV5 {
  args: unknown[];
  docs: string[];
  label: string[];
  module_path: string;
  signature_topic: string;
}

export interface ContractEnvironmentV5 {
  accountId: ContractTypeInfo;
  balance: ContractTypeInfo;
  blockNumber: ContractTypeInfo;
  chainExtension: ContractTypeInfo;
  hash: ContractTypeInfo;
  maxEventTopics: number;
  staticBufferSize: number;
  timestamp: ContractTypeInfo;
}
