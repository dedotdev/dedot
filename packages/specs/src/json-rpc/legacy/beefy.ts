import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { Hash, VersionedFinalityProof } from '@dedot/codecs';

export interface BeefyJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Returns hash of the latest BEEFY finalized block as seen by this client.
   * The latest BEEFY block might not be available if the BEEFY gadget is not running
   * in the network or if the client is still initializing or syncing with the network.
   * In such case an error would be returned.
   *
   * @rpcname beefy_getFinalizedHead
   **/
  beefy_getFinalizedHead: () => Promise<Hash>;

  /**
   * Returns the block most recently finalized by BEEFY, alongside its justification.
   *
   * @subscription beefy_justifications, beefy_subscribeJustifications, beefy_unsubscribeJustifications
   **/
  beefy_subscribeJustifications: (callback: Callback<VersionedFinalityProof>) => Promise<Unsub>;
}
