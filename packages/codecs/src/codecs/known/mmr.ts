import * as $ from '@dedot/shape';
import { $Hash } from '../generic';

/**
 * A type to describe node position in the MMR (node index).
 */
export const $NodeIndex = $.u64;

export type NodeIndex = $.Input<typeof $NodeIndex>;

/**
 * A type to describe leaf position in the MMR.
 *
 * Note this is different from [`NodeIndex`], which can be applied to
 * both leafs and inner nodes. Leafs will always have consecutive `LeafIndex`,
 * but might be actually at different positions in the MMR `NodeIndex`.
 */
export const $LeafIndex = $.u64;

export type LeafIndex = $.Input<typeof $LeafIndex>;

/**
 * Merkle Mountain Range operation error.
 */
export const $MmrError = $.FlatEnum([
  // Error during translation of a block number into a leaf index.
  'InvalidNumericOp,',
  // Error while pushing new node.
  'Push,',
  // Error getting the new root.
  'GetRoot,',
  // Error committing changes.
  'Commit,',
  // Error during proof generation.
  'GenerateProof,',
  // Proof verification error.
  'Verify',
  // Leaf not found in the storage.
  'LeafNotFound,',
  // Mmr Pallet not included in runtime
  'PalletNotIncluded,',
  // Cannot find the requested leaf index
  'InvalidLeafIndex,',
  // The provided best know block number is invalid.
  'InvalidBestKnownBlock,',
]);

export type MmrError = $.Input<typeof $MmrError>;

/**
 * An MMR proof data for a group of leaves.
 */
export const $MmrBatchProof = $.Struct({
  leafIndices: $.Vec($LeafIndex),
  // Number of leaves in MMR, when the proof was generated.
  leafCount: $NodeIndex,
  // Proof elements (hashes of siblings of inner nodes on the path to the leaf).
  items: $.Vec($Hash),
});

export type MmrBatchProof = $.Input<typeof $MmrBatchProof>;

/**
 *
 * A type-safe wrapper for the concrete leaf type.
 *
 * This structure serves merely to avoid passing raw `Vec<u8>` around.
 * It must be `Vec<u8>`-encoding compatible.
 *
 * It is different from [`OpaqueLeaf`], because it does implement `Codec`
 * and the encoding has to match raw `Vec<u8>` encoding.
 */
export const $MmrEncodableOpaqueLeaf = $.PrefixedHex;

export type MmrEncodableOpaqueLeaf = $.Input<typeof $MmrEncodableOpaqueLeaf>;

//TODO: Handle nested tuple or wrapper types
export const $GeneratedMmrProofResult = $.Tuple($.Vec($MmrEncodableOpaqueLeaf), $MmrBatchProof);
export type GeneratedMmrProofResult = $.Input<typeof $GeneratedMmrProofResult>;
