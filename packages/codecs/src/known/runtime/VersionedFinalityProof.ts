import * as $ from '@delightfuldot/shape';

export const $BeefyPayloadId = $.FixedHex(2);
export const $Payload = $.Vec($.Tuple($BeefyPayloadId, $.PrefixedHex));

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

/*
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/3fef703e3027a60cbeba8a72369554c6dabfb689/substrate/primitives/consensus/beefy/src/commitment.rs#L237-L242
 */
export const $VersionedFinalityProof = $.Enum({
  // SignedCommitment using a custom [Encode] and [Decode] implementations from CompactSignedCommitment

  // Current active version
  V1: { index: 1, value: $CompactSignedCommitment },
});

export type VersionedFinalityProof = $.Input<typeof $VersionedFinalityProof>;
