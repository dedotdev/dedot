import { BlockHash, BlockNumber, Hash } from '@dedot/codecs';
import { GenericJsonRpcApis } from '@dedot/types';
import { LeavesProof } from './types/index.js';

export interface MmrJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Generate an MMR proof for the given `block_numbers`.
   *
   * This method calls into a runtime with MMR pallet included and attempts to generate
   * an MMR proof for the set of blocks that have the given `block_numbers` with the MMR root at
   * `best_known_block_number`. `best_known_block_number` must be larger than all the
   * `block_numbers` for the function to succeed.
   *
   * Optionally via `at`, a block hash at which the runtime should be queried can be specified.
   * Optionally via `best_known_block_number`, the proof can be generated using the MMR's state
   * at a specific best block. Note that if `best_known_block_number` is provided, then also
   * specifying the block hash via `at` isn't super-useful here, unless you're generating proof
   * using non-finalized blocks where there are several competing forks. That's because MMR state
   * will be fixed to the state with `best_known_block_number`, which already points to
   * some historical block.
   *
   * Returns the (full) leaves and a proof for these leaves (compact encoding, i.e. hash of
   * the leaves). Both parameters are SCALE-encoded.
   * The order of entries in the `leaves` field of the returned struct
   * is the same as the order of the entries in `block_numbers` supplied
   *
   * @rpcname mmr_generateProof
   * @param {Array<BlockNumber>} blockNumbers
   * @param {BlockNumber} bestKnownBlockNumber
   * @param {BlockHash} at
   **/
  mmr_generateProof: (
    blockNumbers: Array<BlockNumber>,
    bestKnownBlockNumber?: BlockNumber,
    at?: BlockHash,
  ) => Promise<LeavesProof>;

  /**
   * Get the MMR root hash for the current best block
   *
   * @rpcname mmr_root
   * @param {BlockHash} at
   **/
  mmr_root: (at?: BlockHash) => Promise<Hash>;

  /**
   * Verify an MMR `proof`.
   *
   * This method calls into a runtime with MMR pallet included and attempts to verify
   * an MMR proof.
   *
   * Returns `true` if the proof is valid, else returns the verification error.
   *
   * @rpcname mmr_verifyProof
   * @param {LeavesProof} proof
   **/
  mmr_verifyProof: (proof: LeavesProof) => Promise<boolean>;

  /**
   * Verify an MMR `proof` statelessly given an `mmr_root`.
   *
   * This method calls into a runtime with MMR pallet included and attempts to verify
   * an MMR proof against a provided MMR root.
   *
   * Returns `true` if the proof is valid, else returns the verification error.
   *
   * @rpcname mmr_verifyProofStateless
   * @param {Hash} mmrRoot
   * @param {LeavesProof} proof
   **/
  mmr_verifyProofStateless: (mmrRoot: Hash, proof: LeavesProof) => Promise<boolean>;
}
