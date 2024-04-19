import { GenericJsonRpcApis } from '@dedot/types';
import { Properties } from '../types/index.js';

/**
 * chainSpec-prefixed JSON-RPC methods.
 *
 * @version v1
 */
export interface ChainSpecV1 extends GenericJsonRpcApis {
  /**
   * Get the chain name, as present in the chain specification.
   *
   * @rpcname chainSpec_v1_chainName
   * @version v1
   */
  chainSpec_v1_chainName(): Promise<string>;
  /**
   * Get the chain's genesis hash.
   *
   * @rpcname chainSpec_v1_genesisHash
   * @version v1
   */
  chainSpec_v1_genesisHash(): Promise<string>;
  /**
   * Get the properties of the chain, as present in the chain specification.
   *
   * @rpcname chainSpec_v1_properties
   * @version v1
   */
  chainSpec_v1_properties(): Promise<Properties>;
}
