import { blake3AsU8a, concatU8a } from '@dedot/utils';
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

  // Recursive true DFS function to traverse the tree top-down
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

/**
 * Verify a Merkle proof
 *
 * @param rootHash - The expected root hash
 * @param leaves - The leaf nodes included in the proof
 * @param leafIndices - The indices of the leaves in the original tree
 * @param proofs - The proof nodes
 * @returns Whether the proof is valid
 */
export function verifyProof(
  rootHash: Uint8Array,
  leaves: Uint8Array[],
  leafIndices: number[],
  proofs: Uint8Array[],
): boolean {
  if (leaves.length === 0 || leafIndices.length === 0) {
    // Empty proof is only valid for an empty tree (root is null)
    return rootHash.length === 0;
  }

  // Create a map to store known nodes (leaves and proof nodes)
  const nodeMap = new Map<number, Uint8Array>();

  // Add the leaves to the map at their respective indices
  for (let i = 0; i < leaves.length; i++) {
    nodeMap.set(leafIndices[i], leaves[i]);
  }

  // Create a queue of nodes to process
  let nodesToProcess = [...leafIndices];

  // Keep track of which proof nodes have been used
  const unusedProofs = [...proofs];

  // Process nodes until we reach the root or can't proceed further
  while (nodesToProcess.length > 0 && !nodeMap.has(0)) {
    const nextNodesToProcess = new Set<number>();

    for (const nodeIdx of nodesToProcess) {
      // Skip the root node
      if (nodeIdx === 0) continue;

      // Get the sibling index
      const siblingIdx = nodeIdx % 2 === 0 ? nodeIdx - 1 : nodeIdx + 1;

      // If we don't have the sibling in our map, try to find it in the unused proofs
      if (!nodeMap.has(siblingIdx)) {
        // We need to assign a proof node to this sibling
        if (unusedProofs.length === 0) {
          // No more proof nodes available, but we need one
          return false;
        }

        // Use the next available proof node
        nodeMap.set(siblingIdx, unusedProofs.shift()!);
      }

      // Calculate the parent index
      const parentIdx = Math.floor((nodeIdx - 1) / 2);

      // If we already have the parent, skip
      if (nodeMap.has(parentIdx)) {
        continue;
      }

      // Make sure we have both children of the parent
      const leftChildIdx = parentIdx * 2 + 1;
      const rightChildIdx = parentIdx * 2 + 2;

      if (nodeMap.has(leftChildIdx) && nodeMap.has(rightChildIdx)) {
        // Calculate the parent hash
        const leftChild = nodeMap.get(leftChildIdx)!;
        const rightChild = nodeMap.get(rightChildIdx)!;
        const parentHash = blake3AsU8a(concatU8a(leftChild, rightChild));

        // Add the parent to the map
        nodeMap.set(parentIdx, parentHash);

        // Add the parent to the next round of processing
        nextNodesToProcess.add(parentIdx);
      }
    }

    // If we didn't add any new nodes to process, but we haven't reached the root,
    // then the proof is invalid
    if (nextNodesToProcess.size === 0 && !nodeMap.has(0)) {
      return false;
    }

    nodesToProcess = [...nextNodesToProcess];
  }

  // Check if we have the root node
  if (!nodeMap.has(0)) {
    return false;
  }

  // Compare the calculated root with the expected root
  const calculatedRoot = nodeMap.get(0)!;

  // Compare the Uint8Arrays
  if (calculatedRoot.length !== rootHash.length) {
    return false;
  }

  for (let i = 0; i < calculatedRoot.length; i++) {
    if (calculatedRoot[i] !== rootHash[i]) {
      return false;
    }
  }

  return true;
}
