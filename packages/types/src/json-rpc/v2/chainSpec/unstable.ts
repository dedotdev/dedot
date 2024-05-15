import { GenericJsonRpcApis } from '@dedot/types';
import { Properties } from '../types/index.js';

/**
 * chainSpec-prefixed JSON-RPC methods.
 *
 * @version unstable
 */
export interface ChainSpecUnstable extends GenericJsonRpcApis {
  /**
   * Get the chain name, as present in the chain specification.
   *
   * @rpcname chainSpec_unstable_chainName
   * @version unstable
   */
  chainSpec_unstable_chainName(): Promise<string>;
  /**
   * Get the chain's genesis hash.
   *
   * @rpcname chainSpec_unstable_genesisHash
   * @version unstable
   */
  chainSpec_unstable_genesisHash(): Promise<string>;
  /**
   * Get the properties of the chain, as present in the chain specification.
   *
   * @rpcname chainSpec_unstable_properties
   * @version unstable
   */
  chainSpec_unstable_properties(): Promise<Properties>;
}
