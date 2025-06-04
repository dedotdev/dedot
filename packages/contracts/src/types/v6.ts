import { ContractSource } from './shared';
import { ContractMetadataV5 } from './v5.js';

export interface ContractSourceV6 extends ContractSource {
  contract_binary?: string;
}

export interface ContractMetadataV6 extends Omit<ContractMetadataV5, 'source'> {
  source: ContractSourceV6;
  // The version is still 5, maybe for the alpha version
  version: 5;
}
