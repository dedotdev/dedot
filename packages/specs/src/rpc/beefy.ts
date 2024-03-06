import { RpcModuleSpec } from '@dedot/types';
import { $VersionedFinalityProof } from '@dedot/codecs';

export const beefy: RpcModuleSpec = {
  getFinalizedHead: {
    docs: [
      'Returns hash of the latest BEEFY finalized block as seen by this client.',
      'The latest BEEFY block might not be available if the BEEFY gadget is not running',
      'in the network or if the client is still initializing or syncing with the network.',
      'In such case an error would be returned.',
    ],
    params: [],
    type: 'Hash',
  },
  subscribeJustifications: {
    docs: 'Returns the block most recently finalized by BEEFY, alongside its justification.',
    params: [],
    pubsub: ['beefy_justifications', 'beefy_subscribeJustifications', 'beefy_unsubscribeJustifications'],
    type: 'VersionedFinalityProof',
    isScale: true,
    codec: $VersionedFinalityProof,
  },
};
