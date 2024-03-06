import * as $ from '@dedot/shape';
import { RuntimeApiSpec } from '@dedot/types';
import { $BlockNumber, $Header } from '@dedot/codecs';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bc53b9a03a742f8b658806a01a7bf853cb9a86cd/substrate/primitives/offchain/src/lib.rs#L25-L37
 */
export const OffchainWorkerApi: RuntimeApiSpec[] = [
  {
    methods: {
      offchainWorker: {
        docs: 'Starts the off-chain task for given block header.',
        params: [
          {
            name: 'header',
            type: 'Header',
            codec: $Header,
          },
        ],
        type: '[]',
        codec: $.Tuple(),
      },
    },
    version: 2,
  },
  {
    methods: {
      offchainWorker: {
        docs: 'Starts the off-chain task for given block number.',
        params: [
          {
            name: 'number',
            type: 'BlockNumber',
            codec: $BlockNumber,
          },
        ],
        type: '[]',
        codec: $.Tuple(),
      },
    },
    version: 1,
  },
];
