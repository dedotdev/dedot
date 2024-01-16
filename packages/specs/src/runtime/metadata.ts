import { RuntimeCalls, RuntimeApisModule } from '@delightfuldot/types';

const V1_V2_SHARED: RuntimeCalls = {
  metadata: {
    docs: 'Returns the metadata of a runtime.',
    params: [],
    type: 'OpaqueMetadata',
  },
};

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/eaf1bc5633ebbacce97e4f167ebe1d0d268c4b24/substrate/primitives/api/src/lib.rs#L811-L827
 */
export const metadata: RuntimeApisModule = {
  Metadata: [
    {
      methods: {
        metadataAtVersion: {
          docs: 'Returns the metadata at a given version.',
          params: [
            {
              name: 'version',
              type: 'u32',
            },
          ],
          type: 'Option<OpaqueMetadata>',
        },
        metadataVersions: {
          docs: 'Returns the supported metadata versions.',
          params: [],
          type: 'Array<u32>',
        },
        ...V1_V2_SHARED,
      },
      version: 2,
    },
    {
      methods: { ...V1_V2_SHARED },
      version: 1,
    },
  ],
};
