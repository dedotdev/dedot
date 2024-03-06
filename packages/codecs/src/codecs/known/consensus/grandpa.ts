import * as $ from '@dedot/shape';
import { $AccountId32, $BlockHash, $BlockNumber } from '../../generic';
import { $H512 } from '../primitives';

/**
 * The monotonic identifier of a GRANDPA set of authorities.
 */
export const $SetId = $.u64;

export type SetId = $.Input<typeof $SetId>;

/**
 * The weight of an authority.
 */
export const $AuthorityWeight = $.u64;

/**
 * A list of Grandpa authorities with associated weights.
 */
export const $AuthorityList = $.Vec($.Tuple($AccountId32, $AuthorityWeight));

export type AuthorityList = $.Input<typeof $AuthorityList>;

/**
 * A prevote for a block and its ancestors.
 */
export const $Prevote = $.Struct({
  /// The target block's hash.
  targetHash: $BlockHash,
  /// The target block's number.
  targetNumber: $BlockNumber,
});

/**
 * A precommit for a block and its ancestors.
 */
export const $Precommit = $.Struct({
  /// The target block's hash.
  targetHash: $BlockHash,
  /// The target block's number
  targetNumber: $BlockNumber,
});

/**
 * An equivocation (double-vote) in a given round.
 *
 * Ref: https://github.com/paritytech/finality-grandpa/blob/master/src/lib.rs#L210
 */
export const $GrandpaEquivocation = $.Struct({
  /// The round number equivocated in.
  roundNumber: $.u64,
  /// The identity of the equivocator.
  identity: $AccountId32,
  /// The first vote in the equivocation.
  first: $.Tuple($Prevote, $H512),
  /// The second vote in the equivocation.
  second: $.Tuple($Prevote, $H512),
});

/**
 * Wrapper object for GRANDPA equivocation proofs, useful for unifying prevote
 * and precommit equivocations under a common type.
 */
export const $Equivocation = $.Enum({
  Prevote: $GrandpaEquivocation,
  Precommit: $GrandpaEquivocation,
});

/**
 * Proof of voter misbehavior on a given set id. Misbehavior/equivocation in
 * GRANDPA happens when a voter votes on the same round (either at prevote or
 * precommit stage) for different blocks. Proving is achieved by collecting the
 * signed messages of conflicting votes.
 */
export const $GrandpaEquivocationProof = $.Struct({
  setId: $SetId,
  equivocation: $Equivocation,
});

export type GrandpaEquivocationProof = $.Input<typeof $GrandpaEquivocationProof>;
