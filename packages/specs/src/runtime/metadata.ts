import { RuntimeApis, RuntimeApisModule } from '@delightfuldot/types';

const V1_V2_SHARED: RuntimeApis = {
  metadata: {
    docs: 'Returns the metadata of a runtime.',
    params: [],
    type: 'OpaqueMetadata',
  },
};

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
