import { blake3AsU8a, concatU8a } from '@dedot/utils';

/**
 * Build a merkle tree from leaves
 *
 * ```
 *      0
 *    /   \
 *   1     2
 *  / \   / \
 * 3   4 5   6
 * ```
 *
 * @param leaves - Leaf data to build tree from
 * @returns Root of the merkle tree
 */
export function buildMerkleTree(leaves: Uint8Array[]): Uint8Array[] {
  // Handle empty trees
  if (leaves.length === 0) {
    return [];
  }

  // Handle single leaf trees
  if (leaves.length === 1) {
    return [blake3AsU8a(leaves[0])];
  }

  const nodes: Uint8Array[] = Array<Uint8Array>(leaves.length * 2 - 1);

  const startingIndex = leaves.length - 1;
  for (let i = startingIndex; i < nodes.length; i += 1) {
    nodes[i] = blake3AsU8a(leaves[i - leaves.length + 1]);
  }

  for (let i = nodes.length - 2; i >= 0; i -= 2) {
    const left = nodes[i];
    const right = nodes[i + 1];
    const nextLevelIndex = (i - 1) / 2;

    nodes[nextLevelIndex] = blake3AsU8a(concatU8a(left, right));
  }

  // A different implementation
  // Ref: https://polkadot-fellows.github.io/RFCs/approved/0078-merkleized-metadata.html#building-the-merkle-tree-root
  // while (nodes.length > 1) {
  //   const right = nodes.pop()!;
  //   const left = nodes.pop()!;
  //   nodes.unshift(blake3AsU8a(concatU8a(left, right)));
  // }

  return nodes;
}
