import { RuntimeApisModule } from '@delightfuldot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bc53b9a03a742f8b658806a01a7bf853cb9a86cd/substrate/primitives/block-builder/src/lib.rs#L25-L52
 */
export const blockBuilder: RuntimeApisModule = {
  BlockBuilder: [
    {
      methods: {
        // Type changed in v6
        applyExtrinsic: {
          description: 'Apply the given extrinsic.',
          params: [
            {
              name: 'extrinsic',
              type: 'Bytes',
            },
          ],
          type: 'ApplyExtrinsicResult',
        },
        checkInherents: {
          description: 'Check that the inherents are valid.',
          params: [
            {
              name: 'block',
              type: 'Block',
            },
            {
              name: 'data',
              type: 'InherentData',
            },
          ],
          type: 'CheckInherentsResult',
        },
        inherentExtrinsics: {
          description: 'Generate inherent extrinsics.',
          params: [
            {
              name: 'inherent',
              type: 'InherentData',
            },
          ],
          type: 'Array<Extrinsic>',
        },
        // Renamed in v3 from finalize_block
        finalizeBlock: {
          description: 'Finish the current block.',
          params: [],
          type: 'Header',
        },
      },
      version: 6,
    },
  ],
};
