import { GenericJsonRpcApis } from '@dedot/types';
import { Properties } from '../types/index.js';

/**
 * chainSpec-prefixed JSON-RPC methods.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/7430f413503f8008fe60eb2e4ebd76d14af12ea9/substrate/client/rpc-spec-v2/src/chain_spec/api.rs#L25-L41
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
