import { InkContractSource } from './shared.js';
import { InkContractMetadataV5 } from './v5.js';

export interface InkContractSourceV6 extends Omit<InkContractSource, 'wasm'> {
  contract_binary?: string;
}

export interface InkContractMetadataV6 extends Omit<InkContractMetadataV5, 'source'> {
  source: InkContractSourceV6;
  // The version is still 5, maybe for the alpha version
  version: 5;
}
