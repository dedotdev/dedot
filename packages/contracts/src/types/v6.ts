import { ContractMetadataV5 } from './v5.js';

export interface ContractMetadataV6 extends ContractMetadataV5 {
  // The version is still 5, maybe for the alpha version
  version: 5;
}
