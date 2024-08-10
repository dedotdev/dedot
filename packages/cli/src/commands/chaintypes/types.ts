import { Metadata, RuntimeVersion } from '@dedot/codecs';

export type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
  dts?: boolean;
  subpath?: boolean;
  runtimeFile?: string;
  metadataFile?: string;
};


export interface ParsedResult extends DecodedResult {
  rpcMethods: string[];
}

export interface DecodedResult {
  metadata: Metadata;
  runtimeVersion: RuntimeVersion;
  runtimeApis: Record<string, number>;
}
