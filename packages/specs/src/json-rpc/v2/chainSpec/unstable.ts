import { GenericJsonRpcApis } from '@dedot/types';
import { Properties } from '../types/index.js';

export interface ChainSpecUnstable extends GenericJsonRpcApis {
  /**
   * Get the chain name, as present in the chain specification.
   *
   * @rpcname chainSpec_unstable_chainName
   */
  chainSpec_unstable_chainName: () => Promise<string>;
  /**
   * Get the chain's genesis hash.
   *
   * @rpcname chainSpec_unstable_genesisHash
   */
  chainSpec_unstable_genesisHash: () => Promise<string>;
  /**
   * Get the properties of the chain, as present in the chain specification.
   *
   * @rpcname chainSpec_unstable_properties
   */
  chainSpec_unstable_properties: () => Promise<Properties>;
}
