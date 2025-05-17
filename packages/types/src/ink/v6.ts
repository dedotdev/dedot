import { ContractSource } from './shared.js';
import { ContractMetadataV5 } from './v5.js';

export interface ContractSourceV6 extends Omit<ContractSource, 'wasm'> {
  contract_binary?: string;
}

export interface ContractMetadataV6 extends Omit<ContractMetadataV5, 'source'> {
  source: ContractSourceV6;
}
