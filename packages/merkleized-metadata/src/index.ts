// Export types
export * from './types.js';

// Export codecs
export * from './codecs.js';

// Export main class
export * from './MetadataMerkleizer.js';

// Export utility functions
export { calculateMetadataHash, createMetadataDigest } from './digest.js';
export { buildMerkleTree, generateProof } from './merkle.js';
