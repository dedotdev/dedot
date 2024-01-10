import { RpcModuleSpec } from '@delightfuldot/types';
import { atBlockHashParam } from './shared';

export const dev: RpcModuleSpec = {
  getBlockStats: {
    docs: [
      'Reexecute the specified `block_hash` and gather statistics while doing so.\n',
      '\n',
      'This function requires the specified block and its parent to be available\n',
      'at the queried node. If either the specified block or the parent is pruned,\n',
      'this function will return `None`.',
    ],
    params: [atBlockHashParam],
    type: 'Option<BlockStats>',
  },
};
