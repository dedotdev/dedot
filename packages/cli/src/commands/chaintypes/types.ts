import { SubstrateRuntimeVersion } from '@dedot/api';
import { Metadata } from '@dedot/codecs';

export interface ParsedResult extends DecodedMetadataInfo {
  rpcMethods: string[];
}

export interface DecodedMetadataInfo {
  metadata: Metadata;
  runtimeVersion: SubstrateRuntimeVersion;
}
