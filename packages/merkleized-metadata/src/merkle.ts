import { blake3AsU8a, concatU8a } from '@dedot/utils';
import { MetadataTreeNode } from './types.js';

/**
 * Build a merkle tree from leaves
 *
 * @param leaves - Leaf data to build tree from
 * @returns Root of the merkle tree
 */
export function buildMerkleTree(leaves: Uint8Array[]): MetadataTreeNode {
  if (leaves.length === 0) {
    // Return all zeros hash for empty tree
    return { hash: new Uint8Array(32).fill(0) };
  }

  // Hash all leaves
  const leafNodes: MetadataTreeNode[] = leaves.map((leaf) => ({
    hash: blake3AsU8a(leaf),
  }));

  // Build the tree
  return buildTreeFromNodes(leafNodes);
}

/**
 * Build a tree from leaf nodes
 *
 * @param nodes - Leaf nodes
 * @returns Root of the merkle tree
 */
function buildTreeFromNodes(nodes: MetadataTreeNode[]): MetadataTreeNode {
  if (nodes.length === 0) {
    // Return all zeros hash for empty tree
    return { hash: new Uint8Array(32).fill(0) };
  }

  if (nodes.length === 1) {
    return nodes[0];
  }

  const nextLevel: MetadataTreeNode[] = [];

  // Process pairs of nodes
  for (let i = 0; i < nodes.length; i += 2) {
    if (i + 1 < nodes.length) {
      // Combine pair of nodes
      const left = nodes[i];
      const right = nodes[i + 1];
      const parentHash = blake3AsU8a(concatU8a(left.hash, right.hash));

      nextLevel.push({
        hash: parentHash,
        left,
        right,
      });
    } else {
      // Odd number of nodes, promote the last one to the next level
      nextLevel.push(nodes[i]);
    }
  }

  // Recursively build the next level
  return buildTreeFromNodes(nextLevel);
}

/**
 * Get the level of a node in the tree
 *
 * @param index - Node index
 * @returns Level in the tree
 */
function getLevel(index: number): number {
  return Math.floor(Math.log2(index + 1));
}

/**
 * Get the ancestor index at a specific level
 *
 * @param index - Node index
 * @param levelsUp - Number of levels to go up
 * @returns Ancestor index
 */
function getAncestorIndex(index: number, levelsUp: number): number {
  return ((index + 1) >> levelsUp) - 1;
}

/**
 * Generate proof data for specific leaf indices
 *
 * @param leaves - All leaf data
 * @param indices - Indices of leaves to generate proof for
 * @returns Proof data
 */
export function generateProofData(
  leaves: Uint8Array[],
  indices: number[],
): {
  leaves: Uint8Array[];
  leafIndices: number[];
  proofIndices: number[];
} {
  if (indices.length === 0) {
    return { leaves: [], leafIndices: [], proofIndices: [] };
  }

  // Sort indices
  const sortedIndices = [...indices].sort((a, b) => a - b);

  // Calculate the starting index for leaves in the tree
  const startingIndex = leaves.length - 1;

  // Map to tree indices
  const leafIndices = sortedIndices.map((idx) => startingIndex + idx);

  // Collect proof indices
  const proofIndices: number[] = [];

  // Process each leaf
  let targetIndex = 0;

  const traverse = (nodeIndex: number): void => {
    if (targetIndex === leafIndices.length) {
      // We've processed all target leaves, this node is part of the proof
      proofIndices.push(nodeIndex);
      return;
    }

    const target = leafIndices[targetIndex];

    if (target === nodeIndex) {
      // This is a target leaf, move to the next one
      targetIndex++;
      return;
    }

    const currentLevel = getLevel(nodeIndex);
    const targetLevel = getLevel(target);

    if (nodeIndex !== getAncestorIndex(target, targetLevel - currentLevel)) {
      // This node is not on the path to the target, include it in the proof
      proofIndices.push(nodeIndex);
      return;
    }

    // Traverse both children
    const leftChild = 2 * nodeIndex + 1;
    traverse(leftChild);
    traverse(leftChild + 1);
  };

  // Start traversal from the root
  traverse(0);

  // Return the proof data
  return {
    leaves: sortedIndices.map((idx) => leaves[idx]),
    leafIndices,
    proofIndices,
  };
}

/**
 * Generate proof for specific type information
 *
 * @param encodedTypes - Encoded type information
 * @param typeIndices - Indices of types to include in proof
 * @returns Proof data
 */
export function generateProof(
  encodedTypes: Uint8Array[],
  typeIndices: number[],
): {
  leaves: Uint8Array[];
  leafIndices: number[];
  proofs: Uint8Array[];
} {
  // Generate proof data
  const { leaves, leafIndices, proofIndices } = generateProofData(encodedTypes, typeIndices);

  // Build the tree to get the hashes
  const leafNodes = encodedTypes.map((leaf) => ({ hash: blake3AsU8a(leaf) }));
  const tree = buildTreeFromNodes(leafNodes);

  // Collect proof hashes
  const proofs: Uint8Array[] = [];

  // Helper function to find a node by index
  const findNodeByIndex = (
    node: MetadataTreeNode | undefined,
    index: number,
    currentIndex: number = 0,
  ): MetadataTreeNode | undefined => {
    if (!node) return undefined;
    if (currentIndex === index) return node;

    const leftChild = 2 * currentIndex + 1;
    const rightChild = 2 * currentIndex + 2;

    if (index >= leftChild) {
      // Check right subtree first if index is beyond left child
      if (index >= rightChild) {
        return findNodeByIndex(node.right, index, rightChild);
      }
      // Check left subtree
      return findNodeByIndex(node.left, index, leftChild);
    }

    return undefined;
  };

  // Collect proof hashes
  for (const index of proofIndices) {
    const node = findNodeByIndex(tree, index);
    if (node) {
      proofs.push(node.hash);
    }
  }

  return {
    leaves,
    leafIndices,
    proofs,
  };
}
