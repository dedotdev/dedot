import { BlockHash, Bytes } from '@dedot/codecs';

/*
 * Retrieved MMR leaves and their proof.
 */
export interface LeavesProof {
  // Block hash the proof was generated for.
  blockHash: BlockHash;
  // SCALE-encoded vector of `LeafData`.
  leaves: Bytes;
  // SCALE-encoded proof data. See [sp_mmr_primitives::Proof].
  proof: Bytes;
}
