import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/eaf1bc5633ebbacce97e4f167ebe1d0d268c4b24/substrate/primitives/api/src/lib.rs#L811-L827
 */
export const Metadata: RuntimeApiSpec[] = [
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
      metadata: {
        docs: 'Returns the metadata of a runtime.',
        params: [],
        type: 'OpaqueMetadata',
      },
    },
    version: 2,
  },
];
