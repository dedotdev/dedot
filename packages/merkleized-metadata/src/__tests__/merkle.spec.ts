import { describe, expect, it } from 'vitest';
import { buildMerkleTree, generateProof, generateProofData } from '../merkle.js';
import { blake3AsU8a, concatU8a, u8aToHex, u8aEq } from '@dedot/utils';
import { MetadataTreeNode } from '../types.js';

describe('buildMerkleTree', () => {
  // Helper function to verify a node's hash is correct
  function verifyNodeHash(node: MetadataTreeNode): boolean {
    // If it's a leaf node (no children), we can't verify the hash calculation
    if (!node.left && !node.right) {
      return true;
    }

    // If it has children, verify the hash is the blake3 hash of the concatenated child hashes
    if (node.left && node.right) {
      const expectedHash = blake3AsU8a(concatU8a(node.left.hash, node.right.hash));
      return u8aEq(node.hash, expectedHash);
    }

    // If it only has one child (should not happen in a proper binary tree, but just in case)
    if (node.left) {
      return u8aEq(node.hash, node.left.hash);
    }
    if (node.right) {
      return u8aEq(node.hash, node.right.hash);
    }

    return false;
  }

  // Helper function to verify the entire tree structure
  function verifyTreeStructure(node: MetadataTreeNode): boolean {
    // Verify this node's hash
    if (!verifyNodeHash(node)) {
      return false;
    }

    // Recursively verify children
    if (node.left && !verifyTreeStructure(node.left)) {
      return false;
    }
    if (node.right && !verifyTreeStructure(node.right)) {
      return false;
    }

    return true;
  }

  // Helper function to count the number of nodes in the tree
  function countNodes(node: MetadataTreeNode): number {
    let count = 1; // Count this node
    if (node.left) count += countNodes(node.left);
    if (node.right) count += countNodes(node.right);
    return count;
  }

  // Helper function to get the height of the tree
  function getTreeHeight(node: MetadataTreeNode): number {
    if (!node.left && !node.right) {
      return 0;
    }
    
    const leftHeight = node.left ? getTreeHeight(node.left) : 0;
    const rightHeight = node.right ? getTreeHeight(node.right) : 0;
    
    return Math.max(leftHeight, rightHeight) + 1;
  }

  // Helper function to verify the tree structure is valid
  // In our implementation, a valid tree means:
  // 1. Each non-leaf node has either two children or one left child (in case of odd number of nodes)
  // 2. No node has only a right child
  function isValidTreeStructure(node: MetadataTreeNode): boolean {
    // If it's a leaf node, it's valid
    if (!node.left && !node.right) {
      return true;
    }
    
    // If it has only a right child, it's invalid
    if (!node.left && node.right) {
      return false;
    }
    
    // If it has only a left child, the left child must be a leaf
    if (node.left && !node.right) {
      return !node.left.left && !node.left.right;
    }
    
    // If it has both children, both subtrees must be valid
    return isValidTreeStructure(node.left!) && isValidTreeStructure(node.right!);
  }

  it('should build a correct tree with empty leaves', () => {
    const tree = buildMerkleTree([]);
    
    // For empty leaves, we expect a single node with all zeros hash
    const expectedHash = new Uint8Array(32).fill(0);
    expect(u8aEq(tree.hash, expectedHash)).toBe(true);
    expect(tree.left).toBeUndefined();
    expect(tree.right).toBeUndefined();
  });

  it('should build a correct tree with a single leaf', () => {
    const leaf = new TextEncoder().encode('test');
    const tree = buildMerkleTree([leaf]);
    
    // For a single leaf, the tree should be just the hashed leaf
    const expectedHash = blake3AsU8a(leaf);
    expect(u8aEq(tree.hash, expectedHash)).toBe(true);
    expect(tree.left).toBeUndefined();
    expect(tree.right).toBeUndefined();
  });

  it('should build a correct tree with two leaves', () => {
    const leaf1 = new TextEncoder().encode('leaf1');
    const leaf2 = new TextEncoder().encode('leaf2');
    const tree = buildMerkleTree([leaf1, leaf2]);
    
    // For two leaves, we expect a root with two children
    expect(tree.left).toBeDefined();
    expect(tree.right).toBeDefined();
    
    // Verify the left child hash
    const expectedLeftHash = blake3AsU8a(leaf1);
    expect(tree.left!.hash).toEqual(expectedLeftHash);
    
    // Verify the right child hash
    const expectedRightHash = blake3AsU8a(leaf2);
    expect(tree.right!.hash).toEqual(expectedRightHash);
    
    // Verify the root hash is the hash of the concatenated child hashes
    const expectedRootHash = blake3AsU8a(concatU8a(expectedLeftHash, expectedRightHash));
    expect(tree.hash).toEqual(expectedRootHash);
    
    // Verify the entire tree structure
    expect(verifyTreeStructure(tree)).toBe(true);
  });

  it('should build a correct tree with an odd number of leaves (3)', () => {
    const leaf1 = new TextEncoder().encode('leaf1');
    const leaf2 = new TextEncoder().encode('leaf2');
    const leaf3 = new TextEncoder().encode('leaf3');
    const tree = buildMerkleTree([leaf1, leaf2, leaf3]);
    
    // Verify the tree structure
    expect(verifyTreeStructure(tree)).toBe(true);
    
    // With 3 leaves, we expect a tree with 5 nodes total (3 leaf nodes + 2 internal nodes)
    expect(countNodes(tree)).toBe(5);
    
    // The tree structure should be valid
    expect(isValidTreeStructure(tree)).toBe(true);
  });

  it('should build a correct tree with an even number of leaves (4)', () => {
    const leaves = Array.from({ length: 4 }, (_, i) => 
      new TextEncoder().encode(`leaf${i + 1}`)
    );
    const tree = buildMerkleTree(leaves);
    
    // Verify the tree structure
    expect(verifyTreeStructure(tree)).toBe(true);
    
    // With 4 leaves, we expect a tree with 7 nodes total (4 leaf nodes + 3 internal nodes)
    expect(countNodes(tree)).toBe(7);
    
    // The tree structure should be valid
    expect(isValidTreeStructure(tree)).toBe(true);
  });

  it('should build a correct tree with various numbers of leaves', () => {
    // Test with different numbers of leaves as in the Rust implementation
    const leafCounts = [5, 8, 10, 20, 23, 34, 37, 40];
    
    for (const count of leafCounts) {
      const leaves = Array.from({ length: count }, (_, i) => 
        new TextEncoder().encode(`leaf${i + 1}`)
      );
      const tree = buildMerkleTree(leaves);
      
      // Verify the tree structure
      expect(verifyTreeStructure(tree)).toBe(true);
      
      // The tree structure should be valid
      expect(isValidTreeStructure(tree)).toBe(true);
      
      // The number of nodes should be 2n-1 for a perfect binary tree with n leaves
      // For a complete binary tree, it will be less than or equal to 2n-1
      const nodeCount = countNodes(tree);
      expect(nodeCount).toBeLessThanOrEqual(2 * count - 1);
      
      // The height of the tree should be log2(n) rounded up
      const height = getTreeHeight(tree);
      const expectedMaxHeight = Math.ceil(Math.log2(count));
      expect(height).toBeLessThanOrEqual(expectedMaxHeight);
    }
  });
});

describe('generateProofData', () => {
  it('should generate correct proof data for empty indices', () => {
    const leaves = Array.from({ length: 5 }, (_, i) => 
      new TextEncoder().encode(`leaf${i + 1}`)
    );
    
    const { leaves: proofLeaves, leafIndices, proofIndices } = generateProofData(leaves, []);
    
    expect(proofLeaves).toEqual([]);
    expect(leafIndices).toEqual([]);
    expect(proofIndices).toEqual([]);
  });

  it('should generate correct proof data for a single index', () => {
    const leaves = Array.from({ length: 8 }, (_, i) => 
      new TextEncoder().encode(`leaf${i + 1}`)
    );
    
    // Generate proof for the 3rd leaf (index 2)
    const { leaves: proofLeaves, leafIndices, proofIndices } = generateProofData(leaves, [2]);
    
    // We should have one leaf in the proof
    expect(proofLeaves.length).toBe(1);
    expect(proofLeaves[0]).toEqual(leaves[2]);
    
    // The leaf index should be calculated correctly (startingIndex + leafIndex)
    expect(leafIndices.length).toBe(1);
    expect(leafIndices[0]).toBe(8 - 1 + 2); // startingIndex (7) + leafIndex (2)
    
    // We should have proof indices
    expect(proofIndices.length).toBeGreaterThan(0);
  });

  it('should generate correct proof data for multiple indices', () => {
    const leaves = Array.from({ length: 8 }, (_, i) => 
      new TextEncoder().encode(`leaf${i + 1}`)
    );
    
    // Generate proof for leaves 2 and 5 (indices 1 and 4)
    const { leaves: proofLeaves, leafIndices, proofIndices } = generateProofData(leaves, [1, 4]);
    
    // We should have two leaves in the proof
    expect(proofLeaves.length).toBe(2);
    expect(proofLeaves[0]).toEqual(leaves[1]);
    expect(proofLeaves[1]).toEqual(leaves[4]);
    
    // The leaf indices should be calculated correctly
    expect(leafIndices.length).toBe(2);
    expect(leafIndices[0]).toBe(8 - 1 + 1); // startingIndex (7) + leafIndex (1)
    expect(leafIndices[1]).toBe(8 - 1 + 4); // startingIndex (7) + leafIndex (4)
    
    // We should have proof indices
    expect(proofIndices.length).toBeGreaterThan(0);
  });
});

describe('generateProof', () => {
  it('should generate correct proof for specific type indices', () => {
    // Create some encoded types
    const encodedTypes = Array.from({ length: 10 }, (_, i) => 
      new TextEncoder().encode(`type${i + 1}`)
    );
    
    // Generate proof for types 3 and 7 (indices 2 and 6)
    const { leaves, leafIndices, proofs } = generateProof(encodedTypes, [2, 6]);
    
    // We should have two leaves in the proof
    expect(leaves.length).toBe(2);
    expect(leaves[0]).toEqual(encodedTypes[2]);
    expect(leaves[1]).toEqual(encodedTypes[6]);
    
    // The leaf indices should be calculated correctly
    expect(leafIndices.length).toBe(2);
    
    // We should have proof hashes
    expect(proofs.length).toBeGreaterThan(0);
    
    // Each proof hash should be 32 bytes (BLAKE3 output)
    for (const proof of proofs) {
      expect(proof.length).toBe(32);
    }
  });
});
