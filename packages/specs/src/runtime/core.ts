import * as $ from '@dedot/shape';
import { RuntimeApiSpec } from '@dedot/types';
import { $Block, $Header, $RuntimeVersion } from '@dedot/codecs';

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
        codec: $RuntimeVersion,
      },
      executeBlock: {
        docs: 'Execute the given block.',
        params: [
          {
            name: 'block',
            type: 'Block',
            codec: $Block,
          },
        ],
        type: '[]',
        codec: $.Tuple(),
      },
      // Renamed at v2 (initialise_block)
      initializeBlock: {
        docs: 'Initialize a block with the given header.',
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
    version: 4,
  },
];
