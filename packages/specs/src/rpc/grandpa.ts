import { RpcModuleSpec } from '@delightfuldot/types';

export const grandpa: RpcModuleSpec = {
  proveFinality: {
    docs: 'Prove finality for the given block number, returning the Justification for the last block in the set.',
    params: [
      {
        name: 'blockNumber',
        type: 'BlockNumber',
      },
    ],
    type: 'Option<EncodedFinalityProofs>',
  },
  roundState: {
    docs: 'Returns the state of the current best round state as well as the ongoing background rounds',
    params: [],
    type: 'ReportedRoundStates',
  },
  subscribeJustifications: {
    docs: 'Returns the block most recently finalized by Grandpa, alongside side its justification.',
    params: [],
    pubsub: ['grandpa_justifications', 'grandpa_subscribeJustifications', 'grandpa_unsubscribeJustifications'],
    type: 'JustificationNotification',
  },
};
