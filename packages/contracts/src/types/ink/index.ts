import { ContractEventV4, ContractMetadataV4 } from './v4.js';
import { ContractEventV5, ContractMetadataV5 } from './v5.js';
import { ContractMetadataV6 } from './v6.js';

export * from './shared.js';
export * from './v4.js';
export * from './v5.js';
export * from './v6.js';

export type ContractEventMeta = ContractEventV4 | ContractEventV5;
export type ContractMetadata = ContractMetadataV4 | ContractMetadataV5 | ContractMetadataV6;
