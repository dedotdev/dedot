import { InkContractInformation, InkContractSource, InkContractStorage, InkContractType } from './shared.js';
import { InkContractEnvironmentV4, InkContractEventV4, InkContractSpecV4 } from './v4.js';

export interface InkContractMetadataV5 {
  source: InkContractSource;
  contract: InkContractInformation;
  spec: InkContractSpecV5;
  storage: InkContractStorage;
  types: InkContractType[];
  // This is a numberic field in v5 metadata, but it is a string in v4 metadata
  version: 5;
}

export interface InkContractSpecV5 extends InkContractSpecV4 {
  environment: InkContractEnvironmentV5;
  events: InkContractEventV5[];
}

export interface InkContractEventV5 extends InkContractEventV4 {
  module_path: string;
  signature_topic?: string | null;
}

export interface InkContractEnvironmentV5 extends InkContractEnvironmentV4 {
  staticBufferSize: number;
}
