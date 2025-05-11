import { buildMerkleTree } from './tree';

/**
 * Calculate the level of a node in the Merkle tree
 *
 * @param nodeIndex - Index of the node in the tree array
 * @returns Level of the node in the tree
 */
function getLevel(nodeIndex: number): number {
  return Math.floor(Math.log2(nodeIndex + 1));
}

/**
 * Generate proof data for specific leaf indices using a top-down, depth-first approach
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
  // Handle edge cases
  if (indices.length === 0 || leaves.length === 0) {
    return { leaves: [], leafIndices: [], proofs: [] };
  }

  // Validate indices are in bounds
  if (indices.some((idx) => idx < 0 || idx >= leaves.length)) {
    throw new Error('Leaf index out of bounds');
  }

  // Sort indices for consistency
  indices = [...indices].sort((a, b) => a - b);

  // Build the Merkle tree
  const tree = buildMerkleTree(leaves);

  // Handle single leaf trees
  if (leaves.length === 1) {
    return {
      leaves: [tree[0]],
      leafIndices: [0],
      proofs: [],
    };
  }

  // Calculate the starting index for leaves in the tree
  const leafStartIndex = leaves.length - 1;

  // Map input indices to tree indices
  const leafIndices = indices.map((idx) => leafStartIndex + idx);

  // Get the hashed leaves from the tree (not the raw leaves)
  const knownLeaves = indices.map((idx) => leaves[idx]);

  // Reordering leaves
  const maxLevel = getLevel(leafIndices.at(-1)!);
  const splitPoint = Math.pow(2, maxLevel) - 1;
  const splitIndex = leafIndices.findIndex((x) => x >= splitPoint);

  if (splitIndex > 0) {
    leafIndices.unshift(...leafIndices.splice(splitIndex));
    knownLeaves.unshift(...knownLeaves.splice(splitIndex));
  }

  // Track which nodes we need for the proof
  const proofIndices = new Set<number>();

  // Track which nodes are on the path to target leaves
  const nodesOnPath = new Set<number>();

  // First, mark all nodes on the path from root to each target leaf
  for (const leafIdx of leafIndices) {
    let currentIdx = leafIdx;
    while (currentIdx >= 0) {
      nodesOnPath.add(currentIdx);
      if (currentIdx === 0) break; // Reached the root
      currentIdx = Math.floor((currentIdx - 1) / 2);
    }
  }

  // Recursive DFS to traverse the tree top-down
  function dfs(nodeIdx: number): void {
    // If we've reached an invalid node index, return
    if (nodeIdx >= tree.length) {
      return;
    }

    // If this is a target leaf, we don't need to go further
    if (leafIndices.includes(nodeIdx)) {
      return;
    }

    // If this node is on the path to any target leaf
    if (nodesOnPath.has(nodeIdx)) {
      const leftChildIdx = 2 * nodeIdx + 1;
      const rightChildIdx = 2 * nodeIdx + 2;

      // Process left child first (depth-first)
      if (nodesOnPath.has(leftChildIdx)) {
        // Recursively process left subtree all the way down
        dfs(leftChildIdx);
      } else if (leftChildIdx < tree.length) {
        // Left child is not on path but is a valid node, add to proof
        proofIndices.add(leftChildIdx);
      }

      // Then process right child
      if (nodesOnPath.has(rightChildIdx)) {
        // Recursively process right subtree all the way down
        dfs(rightChildIdx);
      } else if (rightChildIdx < tree.length) {
        // Right child is not on path but is a valid node, add to proof
        proofIndices.add(rightChildIdx);
      }
    }
  }

  // Start DFS traversal from the root
  dfs(0);

  // Return the proof data
  return {
    leaves: knownLeaves,
    leafIndices,
    proofs: [...proofIndices].map((idx: number) => tree[idx]),
  };
}
