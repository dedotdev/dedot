import { RuntimeApiSpec } from '@dedot/types';

/**
 * Reference:
 * - BeefyApi: https://github.com/paritytech/polkadot-sdk/blob/b371c3574190ace0d8dd89b7970a388ad3fa8a6a/substrate/primitives/consensus/beefy/src/lib.rs#L391-L412
 * - BeefyMmrApi: https://github.com/paritytech/polkadot-sdk/blob/21f1811c6600d8a7fe043592ff34dcb79284d583/substrate/frame/beefy-mmr/src/lib.rs#L226-L238
 */
export const BeefyApi: RuntimeApiSpec[] = [
  {
    methods: {
      beefyGenesis: {
        docs: 'Return the block number where BEEFY consensus is enabled/started',
        params: [],
        type: 'Option<BlockNumber>',
      },
      validatorSet: {
        docs: 'Return the current active BEEFY validator set',
        params: [],
        type: 'Option<ValidatorSet>',
      },
      submitReportEquivocationUnsignedExtrinsic: {
        docs: 'Submits an unsigned extrinsic to report an equivocation.',
        params: [
          {
            name: 'equivocationProof',
            type: 'BeefyEquivocationProof',
          },
          {
            name: 'keyOwnerProof',
            type: 'OpaqueKeyOwnershipProof',
          },
        ],
        type: 'Option<[]>',
      },
      generateKeyOwnershipProof: {
        docs: 'Generates a proof of key ownership for the given authority in the given set.',
        params: [
          {
            name: 'setId',
            type: 'ValidatorSetId',
          },
          {
            name: 'authorityId',
            type: 'AccountId32',
          },
        ],
        type: 'Option<OpaqueKeyOwnershipProof>',
      },
    },
    version: 3,
  },
];

export const BeefyMmrApi: RuntimeApiSpec[] = [
  {
    methods: {
      authoritySetProof: {
        docs: 'Return the currently active BEEFY authority set proof.',
        params: [],
        type: 'BeefyAuthoritySet',
      },
      nextAuthoritySetProof: {
        docs: 'Return the next/queued BEEFY authority set proof.',
        params: [],
        type: 'BeefyNextAuthoritySet',
      },
    },
    version: 1,
  },
];
