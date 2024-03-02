import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bc53b9a03a742f8b658806a01a7bf853cb9a86cd/substrate/frame/nomination-pools/runtime-api/src/lib.rs#L26-L41
 */
export const NominationPoolsApi: RuntimeApiSpec[] = [
  {
    methods: {
      pendingRewards: {
        docs: 'Returns the pending rewards for the member that the AccountId was given for.',
        params: [
          {
            name: 'who',
            type: 'AccountId32',
          },
        ],
        type: 'Balance',
      },
      pointsToBalance: {
        docs: 'Returns the equivalent balance of `points` for a given pool.',
        params: [
          {
            name: 'poolId',
            type: 'NpPoolId',
          },
          {
            name: 'points',
            type: 'Balance',
          },
        ],
        type: 'Balance',
      },
      balanceToPoints: {
        docs: 'Returns the equivalent points of `new_funds` for a given pool.',
        params: [
          {
            name: 'poolId',
            type: 'NpPoolId',
          },
          {
            name: 'newFunds',
            type: 'Balance',
          },
        ],
        type: 'Balance',
      },
    },
    version: 1,
  },
];
