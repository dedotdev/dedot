import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/00b85c51dfbc0fecbb8a4dd3635d4c177a6527a6/substrate/frame/staking/runtime-api/src/lib.rs#L25-L33
 */
export const StakingApi: RuntimeApiSpec[] = [
  {
    methods: {
      nominationsQuota: {
        docs: 'Returns the nominations quota for a nominator with a given balance.',
        params: [
          {
            name: 'balance',
            type: 'Balance',
          },
        ],
        type: 'u32',
      },
    },
    version: 1,
  },
];
