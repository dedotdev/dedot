import { Metadata, RuntimeVersion } from '@dedot/codecs';

export interface ParsedResult extends DecodedResult {
  rpcMethods: string[];
}

export interface DecodedResult {
  metadata: Metadata;
  runtimeVersion: RuntimeVersion;
  runtimeApis: Record<string, number>;
}
