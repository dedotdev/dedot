import { ProviderInterface } from '@polkadot/rpc-provider/types';

export type NetworkEndpoint = string;

export interface ApiOptions {
  provider?: ProviderInterface;
  endpoint?: NetworkEndpoint;
  /**
   * Cache metadata in local storage for next time usage
   * For now this only supports browser environments
   *
   * Default: false
   */
  cacheMetadata?: boolean;
}
