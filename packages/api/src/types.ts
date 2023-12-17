import { ProviderInterface } from '@polkadot/rpc-provider/types';

export type NetworkEndpoint = string;

export interface ApiOptions {
  provider?: ProviderInterface;
  endpoint?: NetworkEndpoint;
}
