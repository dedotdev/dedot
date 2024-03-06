import * as $ from '@dedot/shape';
import { $AccountId32, $Header } from '../../generic';

/*
 * The weight of an authority.
 */
export const $BabeAuthorityWeight = $.u64;

export type BabeAuthorityWeight = $.Input<typeof $BabeAuthorityWeight>;

/*
 * Randomness type required by BABE operations.
 */
export const $Randomness = $.FixedHex(32);

export type Randomness = $.Input<typeof $Randomness>;

/*
 * Types of allowed slots.
 */
export const $AllowedSlots = $.FlatEnum([
  // Only allow primary slots.
  'PrimarySlots',
  // Allow primary and secondary plain slots.
  'PrimaryAndSecondaryPlainSlots',
  // Allow primary and secondary VRF slots.
  'PrimaryAndSecondaryVRFSlots',
]);

export type AllowedSlots = $.Input<typeof $AllowedSlots>;

/*
 * Configuration data used by the BABE consensus engine.
 */
export const $BabeConfiguration = $.Struct({
  // The slot duration in milliseconds for BABE. Currently, only
  // the value provided by this type at genesis will be used.
  //
  // Dynamic slot duration may be supported in the future.
  slotDuration: $.u64,
  // The duration of epochs in slots.
  epochLength: $.u64,
  // A constant value that is used in the threshold calculation formula.
  // Expressed as a rational where the first member of the tuple is the
  // numerator and the second is the denominator. The rational should
  // represent a value between 0 and 1.
  // In the threshold formula calculation, `1 - c` represents the probability
  // of a slot being empty.
  c: $.Tuple($.u64, $.u64),
  // The authorities
  authorities: $.Vec($.Tuple($AccountId32, $BabeAuthorityWeight)),
  // The randomness
  randomness: $Randomness,
  // Type of allowed slots.
  allowedSlots: $AllowedSlots,
});

export type BabeConfiguration = $.Input<typeof $BabeConfiguration>;

/*
 * Configuration data used by the BABE consensus engine.
 */
export const $BabeConfigurationV1 = $.Struct({
  // The slot duration in milliseconds for BABE. Currently, only
  // the value provided by this type at genesis will be used.
  ///
  // Dynamic slot duration may be supported in the future.
  slotDuration: $.u64,

  // The duration of epochs in slots.
  epochLength: $.u64,

  // A constant value that is used in the threshold calculation formula.
  // Expressed as a rational where the first member of the tuple is the
  // numerator and the second is the denominator. The rational should
  // represent a value between 0 and 1.
  // In the threshold formula calculation, `1 - c` represents the probability
  // of a slot being empty.
  c: $.Tuple($.u64, $.u64),

  // The authorities for the genesis epoch.
  authorities: $.Vec($.Tuple($AccountId32, $BabeAuthorityWeight)),

  // The randomness for the genesis epoch.
  randomness: $Randomness,

  // Whether this chain should run with secondary slots, which are assigned
  // in round-robin manner.
  secondarySlots: $.bool,
});

export type BabeConfigurationV1 = $.Input<typeof $BabeConfigurationV1>;

/*
 * Unit type wrapper that represents a slot.
 */
export const $Slot = $.u64;

export type Slot = $.Input<typeof $Slot>;

/*
 * Configuration data used by the BABE consensus engine that may change with epochs.
 */
export const $BabeEpochConfiguration = $.Struct({
  // A constant value that is used in the threshold calculation formula.
  // Expressed as a rational where the first member of the tuple is the
  // numerator and the second is the denominator. The rational should
  // represent a value between 0 and 1.
  // In the threshold formula calculation, `1 - c` represents the probability
  // of a slot being empty.
  c: $.Tuple($.u64, $.u64),
  // Whether this chain should run with secondary slots, which are assigned
  // in round-robin manner.
  allowedSlots: $AllowedSlots,
});

export type BabeEpochConfiguration = $.Input<typeof $BabeEpochConfiguration>;

/*
 * BABE epoch information
 */
export const $BabeEpoch = $.Struct({
  // The epoch index
  epochIndex: $.u64,
  // The starting slot of the epoch.
  startSlot: $Slot,
  // The duration of this epoch.
  duration: $.u64,
  // The authorities and their weights.
  authorities: $.Vec($.Tuple($AccountId32, $BabeAuthorityWeight)),
  // Randomness for this epoch.
  randomness: $Randomness,
  // Configuration of the epoch.
  config: $BabeEpochConfiguration,
});

export type BabeEpoch = $.Input<typeof $BabeEpoch>;

/*
 * An equivocation proof for multiple block authorships on the same slot (i.e. double vote).
 */
export const $BabeEquivocationProof = $.Struct({
  // Returns the authority id of the equivocator.
  offender: $AccountId32,
  // The slot at which the equivocation happened.
  slot: $Slot,
  // The first header involved in the equivocation.
  firstHeader: $Header,
  // The second header involved in the equivocation.
  secondHeader: $Header,
});

export type BabeEquivocationProof = $.Input<typeof $BabeEquivocationProof>;
