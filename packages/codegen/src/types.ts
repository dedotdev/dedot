import { FixedBytes } from '@delightfuldot/codecs';

export type NetworkInfo = {
  chain: string;
  endpoint?: string;
  metadataHex?: string;
  rpcMethods?: string[];
};
