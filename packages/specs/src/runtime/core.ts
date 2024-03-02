import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/eaf1bc5633ebbacce97e4f167ebe1d0d268c4b24/substrate/primitives/api/src/lib.rs#L799-L809
 */
export const Core: RuntimeApiSpec[] = [
  {
    methods: {
      version: {
        docs: 'Returns the version of the runtime.',
        params: [],
        type: 'RuntimeVersion',
      },
      executeBlock: {
        docs: 'Execute the given block.',
        params: [
          {
            name: 'block',
            type: 'Block',
          },
        ],
        type: '[]',
      },
      // Renamed at v2 (initialise_block)
      initializeBlock: {
        docs: 'Initialize a block with the given header.',
        params: [
          {
            name: 'header',
            type: 'Header',
          },
        ],
        type: '[]',
      },
    },
    version: 4,
  },
];
