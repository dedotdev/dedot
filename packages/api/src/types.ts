import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { HexString } from '@delightfuldot/utils';

export type NetworkEndpoint = string;

export interface ApiOptions {
  provider?: ProviderInterface;
  endpoint?: NetworkEndpoint;
  /**
   * Cache metadata in local storage for next time usage
   * For now this only supports browser environments
   *
   * @default: false
   */
  cacheMetadata?: boolean;
  metadata?: HexString | Record<string, HexString>;
}

export interface NormalizedApiOptions extends ApiOptions {
  metadata?: Record<string, HexString>;
}
