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
  
  // Create a Set for efficient lookup
  const leafIndicesSet = new Set(leafIndices);
  
  // Collect proof indices
  const proofIndicesSet = new Set<number>();
  
  // For each leaf index, traverse up the tree and collect sibling nodes
  for (const leafIdx of leafIndices) {
    let currentIdx = leafIdx;
    
    while (currentIdx > 0) { // While not at the root
      // Get sibling index
      const siblingIdx = currentIdx % 2 === 0 
        ? currentIdx - 1  // If current is right child, sibling is left
        : currentIdx + 1; // If current is left child, sibling is right
      
      // If sibling exists and is not one of our target nodes, add to proof
      if (siblingIdx < nodes.length && !leafIndicesSet.has(siblingIdx)) {
        proofIndicesSet.add(siblingIdx);
      }
      
      // Move up to parent
      currentIdx = Math.floor((currentIdx - 1) / 2);
    }
  }
  
  // Convert Set to Array and sort
  const proofIndices = [...proofIndicesSet].sort((a, b) => a - b);

  // Return the proof data
  return {
    leaves: leafIndices.map((idx) => nodes[idx]),
    leafIndices,
    proofs: proofIndices.map((idx) => nodes[idx]),
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
  proofs: Uint8Array[]
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
