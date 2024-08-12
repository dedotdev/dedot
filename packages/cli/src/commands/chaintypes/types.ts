import { Metadata, RuntimeVersion } from '@dedot/codecs';

export interface ParsedResult extends DecodedMetadataInfo {
  rpcMethods: string[];
}

export interface DecodedMetadataInfo {
  metadata: Metadata;
  runtimeVersion: RuntimeVersion;
  runtimeApis: Record<string, number>;
}
