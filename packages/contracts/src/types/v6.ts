import { ContractInformation, ContractSource, ContractType } from './shared';
import { ContractSourceV4 } from './v4';
import { ContractMetadataV5, ContractSpecV5, ContractStorageV5 } from './v5.js';

export interface ContractSourceV6 extends ContractSource {
  contract_binary?: string;
}

export interface ContractMetadataV6 {
  source: ContractSourceV6;
  contract: ContractInformation;
  spec: ContractSpecV5;
  storage: ContractStorageV5;
  types: ContractType[];
  version: 6;
}
