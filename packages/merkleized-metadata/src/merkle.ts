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

  // Ref: https://polkadot-fellows.github.io/RFCs/approved/0078-merkleized-metadata.html#building-the-merkle-tree-root
  // while (nodes.length > 1) {
  //   const right = nodes.pop()!;
  //   const left = nodes.pop()!;
  //   nodes.unshift(blake3AsU8a(concatU8a(left, right)));
  // }

  return nodes;
}

/**
 * Generate proof data for specific leaf indices
 *
 * @param leaves - All leaf nodes
 * @param indices - Indices of leaves to generate proof for
 * @returns Proof data
 */
export function generateProof(
  leaves: Uint8Array[],
  indices: number[],
): {
  leaves: Uint8Array[];
  leafIndices: number[];
  proofs: Uint8Array[];
} {
  if (indices.length === 0) {
    return { leaves: [], leafIndices: [], proofs: [] };
  }

  // Sort indices
  indices = [...indices].sort((a, b) => a - b);

  // Calculate the starting index for leaves in the tree
  const startingIndex = leaves.length - 1;

  const nodes = buildMerkleTree(leaves);

  // Map to tree indices
  const leafIndices = indices.map((idx) => startingIndex + idx);

  // Collect proof indices
  const proofIndices: number[] = [];

  // TODO Implement algorithm to extract proofIndices

  // Return the proof data
  return {
    leaves: leafIndices.map((idx) => nodes[idx]),
    leafIndices,
    proofs: proofIndices.map((idx) => nodes[idx]),
  };
}
