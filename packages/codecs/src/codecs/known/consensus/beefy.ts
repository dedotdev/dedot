import * as $ from '@dedot/shape';
import { $AccountId32 } from '../../generic';
import { $H256, $H512 } from '../primitives';

export const $BeefyPayloadId = $.FixedHex(2);

export type BeefyPayloadId = $.Input<typeof $BeefyPayloadId>;

export const $Payload = $.Vec($.Tuple($BeefyPayloadId, $.PrefixedHex));

export type Payload = $.Input<typeof $Payload>;

export const $Commitment = $.Struct({
  //  A collection of payloads to be signed, see [`Payload`] for details.
  //
  // One of the payloads should be some form of cumulative representation of the chain (think
  // MMR root hash). Additionally one of the payloads should also contain some details that
  // allow the light client to verify next validator set. The protocol does not enforce any
  // particular format of this data, nor how often it should be present in commitments, however
  // the light client has to be provided with full validator set whenever it performs the
  // transition (i.e. importing first block with
  // [validator_set_id](Commitment::validator_set_id) incremented).
  payload: $Payload,

  // Finalized block number this commitment is for.
  //
  // GRANDPA validators agree on a block they create a commitment for and start collecting
  // signatures. This process is called a round.
  // There might be multiple rounds in progress (depending on the block choice rule), however
  // since the payload is supposed to be cumulative, it is not required to import all
  // commitments.
  // BEEFY light client is expected to import at least one commitment per epoch,
  // but is free to import as many as it requires.
  blockNumber: $.u32,

  // BEEFY validator set supposed to sign this commitment.
  //
  // Validator set is changing once per epoch. The Light Client must be provided by details
  // about the validator set whenever it's importing first commitment with a new
  // `validator_set_id`. Validator set data MUST be verifiable, for instance using
  // [payload](Commitment::payload) information.
  validatorSetId: $.u64,
});

export type Commitment = $.Input<typeof $Commitment>;

export const $CompactSignedCommitment = $.Struct({
  // The commitment, unchanged compared to regular [`SignedCommitment`].
  commitment: $Commitment,

  // A bitfield representing presence of a signature coming from a validator at some index.
  //
  // The bit at index `0` is set to `1` in case we have a signature coming from a validator at
  // index `0` in the original validator set. In case the [`SignedCommitment`] does not
  // contain that signature the `bit` will be set to `0`. Bits are packed into `Vec<u8>`
  signatures_from: $.PrefixedHex,

  // Number of validators in the Validator Set and hence number of significant bits in the
  // [`signatures_from`] collection.
  //
  // Note this might be smaller than the size of `signatures_compact` in case some signatures
  // are missing.
  validator_set_len: $.u32,

  // A `Vec` containing all `Signature`s present in the original [`SignedCommitment`].
  //
  // Note that in order to associate a `Signature` from this `Vec` with a validator, one needs
  // to look at the `signatures_from` bitfield, since some validators might have not produced a
  // signature.
  signatures_compact: $.Vec($.FixedHex(65)),
});

export type CompactSignedCommitment = $.Input<typeof $CompactSignedCommitment>;

/*
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/3fef703e3027a60cbeba8a72369554c6dabfb689/substrate/primitives/consensus/beefy/src/commitment.rs#L237-L242
 */
export const $VersionedFinalityProof = $.Enum({
  // SignedCommitment using a custom [Encode] and [Decode] implementations from CompactSignedCommitment

  // Current active version
  V1: { index: 1, value: $CompactSignedCommitment },
});

export type VersionedFinalityProof = $.Input<typeof $VersionedFinalityProof>;

/**
 * A typedef for validator set id.
 */
export const $ValidatorSetId = $.u64;

export type ValidatorSetId = $.Input<typeof $ValidatorSetId>;

/**
 * A set of BEEFY authorities, a.k.a. validators.
 */
export const $ValidatorSet = $.Struct({
  /// Public keys of the validator set elements
  validators: $.Vec($AccountId32),
  /// Identifier of the validator set
  id: $ValidatorSetId,
});

export type ValidatorSet = $.Input<typeof $ValidatorSet>;

/**
 * BEEFY vote message.
 *
 * A vote message is a direct vote created by a BEEFY node on every voting round
 * and is gossiped to its peers.
 */
export const $VoteMessage = $.Struct({
  /// Commit to information extracted from a finalized block
  commitment: $Commitment,
  /// Node authority id
  id: $AccountId32,
  /// Node signature
  signature: $H512,
});

export type VoteMessage = $.Input<typeof $VoteMessage>;

/**
 * Proof of voter misbehavior on a given set id. Misbehavior/equivocation in
 * BEEFY happens when a voter votes on the same round/block for different payloads.
 * Proving is achieved by collecting the signed commitments of conflicting votes.
 */
export const $BeefyEquivocationProof = $.Struct({
  /// The first vote in the equivocation.
  first: $VoteMessage,
  /// The second vote in the equivocation.
  second: $VoteMessage,
});

export type BeefyEquivocationProof = $.Input<typeof $BeefyEquivocationProof>;

/**
 * Details of a BEEFY authority set.
 */
export const $BeefyAuthoritySet = $.Struct({
  /// Id of the set.
  ///
  /// Id is required to correlate BEEFY signed commitments with the validator set.
  /// Light Client can easily verify that the commitment witness it is getting is
  /// produced by the latest validator set.
  id: $ValidatorSetId,
  /// Number of validators in the set.
  ///
  /// Some BEEFY Light Clients may use an interactive protocol to verify only a subset
  /// of signatures. We put set length here, so that these clients can verify the minimal
  /// number of required signatures.
  len: $.u32,
  /// Commitment(s) to BEEFY AuthorityIds.
  ///
  /// This is used by Light Clients to confirm that the commitments are signed by the correct
  /// validator set. Light Clients using interactive protocol, might verify only subset of
  /// signatures, hence don't require the full list here (will receive inclusion proofs).
  ///
  /// This could be Merkle Root Hash built from BEEFY ECDSA public keys and/or
  /// polynomial commitment to the polynomial interpolating BLS public keys
  /// which is used by APK proof based light clients to verify the validity
  /// of aggregated BLS keys using APK proofs.
  /// Multiple commitments can be tupled together.
  keysetCommitment: $H256,
});

export type BeefyAuthoritySet = $.Input<typeof $BeefyAuthoritySet>;

/**
 * Details of the next BEEFY authority set.
 */
export const $BeefyNextAuthoritySet = $BeefyAuthoritySet;

export type BeefyNextAuthoritySet = $.Input<typeof $BeefyNextAuthoritySet>;
