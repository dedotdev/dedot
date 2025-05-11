import { blake3AsU8a, concatU8a } from '@dedot/utils';
import { describe, expect, it } from 'vitest';
import { buildMerkleTree } from '../merkle/index.js';

describe('merkle', () => {
  describe('buildMerkleTree', () => {
    it('should build a correct tree from leaves', () => {
      // Create simple test data
      const leaves = [
        new Uint8Array([1]), // x
        new Uint8Array([2]),
        new Uint8Array([3]),
        new Uint8Array([4]),
        new Uint8Array([5]),
      ];

      const tree = buildMerkleTree(leaves);
      console.log('tree', tree);

      // Tree should have 2*n-1 nodes
      expect(tree.length).toBe(2 * leaves.length - 1);

      // Verify leaf nodes (they should be hashed versions of the input)
      for (let i = 0; i < leaves.length; i++) {
        const treeIdx = leaves.length - 1 + i;
        expect(tree[treeIdx]).toEqual(blake3AsU8a(leaves[i]));
      }

      // Verify internal nodes
      // Node 1 should be hash of nodes 3 and 4
      expect(tree[1]).toEqual(blake3AsU8a(concatU8a(tree[3], tree[4])));

      // Node 2 should be hash of nodes 5 and 6
      expect(tree[2]).toEqual(blake3AsU8a(concatU8a(tree[5], tree[6])));

      // Root (node 0) should be hash of nodes 1 and 2
      expect(tree[0]).toEqual(blake3AsU8a(concatU8a(tree[1], tree[2])));
    });

    it('should handle a single leaf correctly', () => {
      const leaves = [new Uint8Array([1, 2, 3])];
      const tree = buildMerkleTree(leaves);

      expect(tree.length).toBe(1);
      expect(tree[0]).toEqual(blake3AsU8a(leaves[0]));
    });
  });
});
