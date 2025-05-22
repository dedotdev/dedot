import { ContractInformation, ContractSource, ContractType } from './shared.js';
import { ContractEnvironmentV4, ContractEventV4, ContractSpecV4 } from './v4.js';

export interface ContractMetadataV5 {
  source: ContractSource;
  contract: ContractInformation;
  spec: ContractSpecV5;
  storage: ContractStorageV5;
  types: ContractType[];
  version: 5; // This is a numberic field in v5 metadata, but it is a string in v4 metadata
}

export interface ContractSpecV5 extends ContractSpecV4 {
  environment: ContractEnvironmentV5;
  events: ContractEventV5[];
}

export interface ContractEventV5 extends ContractEventV4 {
  module_path: string;
  signature_topic?: string | null;
}

export interface ContractEnvironmentV5 extends ContractEnvironmentV4 {
  staticBufferSize: number;
}

export interface StructLayoutV5 {
  name: string;
  fields: {
    name: string;
    layout: AnyLayoutV5;
  }[];
}

export interface LeafLayoutV5 {
  key: string;
  ty: number;
}

export interface HashLayoutV5 {
  // TODO support hash layout
}

export interface ArrayLayoutV5 {
  offset: string;
  len: number;
  layout: AnyLayoutV5;
}

export interface EnumLayoutV5 {
  name: string;
  dispatch_key: string;
  variants: Record<number, StructLayoutV5>;
}

export interface RootLayoutV5 {
  root_key: string;
  layout: AnyLayoutV5;
  ty: number;
}

export type AnyLayoutV5 = {
  struct: StructLayoutV5;
  leaf: LeafLayoutV5;
  hash: HashLayoutV5;
  array: ArrayLayoutV5;
  enum: EnumLayoutV5;
  root: RootLayoutV5;
};

export interface ContractStorageV5 {
  root: RootLayoutV5;
}
