import { ContractInformation, ContractSource, ContractStorage, ContractType } from './shared.js';
import { ContractEnvironmentV4, ContractEventV4, ContractSpecV4 } from './v4.js';

export interface ContractMetadataV5 {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpecV5;
  storage: ContractStorage;
  types: ContractType[];
  version: '5';
}

export interface ContractSpecV5 extends ContractSpecV4 {
  environment: ContractEnvironmentV5;
  events: ContractEventV5[];
}

export interface ContractEventV5 extends ContractEventV4 {
  module_path: string;
  signature_topic: string;
}

export interface ContractEnvironmentV5 extends ContractEnvironmentV4 {
  staticBufferSize: number;
}
