import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bc53b9a03a742f8b658806a01a7bf853cb9a86cd/substrate/primitives/offchain/src/lib.rs#L25-L37
 */
export const offchain: RuntimeApisModule = {
  OffchainWorkerApi: [
    {
      methods: {
        offchainWorker: {
          docs: 'Starts the off-chain task for given block header.',
          params: [
            {
              name: 'header',
              type: 'Header',
            },
          ],
          type: 'Null',
        },
      },
      version: 2,
    },
    {
      methods: {
        offchainWorker: {
          docs: 'Starts the off-chain task for given block header.',
          params: [
            {
              name: 'number',
              type: 'BlockNumber',
            },
          ],
          type: 'Null',
        },
      },
      version: 1,
    },
  ],
};