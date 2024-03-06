import * as $ from '@dedot/shape';

export const $Weight = $.Struct({
  // The weight of computational time used based on some reference hardware.
  refTime: $.compactU64,
  // The weight of storage space used by proof of validity.
  proofSize: $.compactU64,
});

export type Weight = $.Input<typeof $Weight>;

export const $Balance = $.u128;

export type Balance = $.Input<typeof $Balance>;

/**
 * A generalized group of dispatch types.
 */
export const $DispatchClass = $.FlatEnum([
  // A normal dispatch.
  'Normal',
  // An operational dispatch.
  'Operational',
  // A mandatory dispatch. These kinds of dispatch are always included regardless of their
  // weight, therefore it is critical that they are separately validated to ensure that a
  // malicious validator cannot craft a valid but impossibly heavy block. Usually this just
  // means ensuring that the extrinsic can only be included once and that it is always very
  // light.
  //
  // Do *NOT* use it for extrinsics that can be heavy.
  //
  // The only real use case for this is inherent extrinsics that are required to execute in a
  // block for the block to be valid, and it solves the issue in the case that the block
  // initialization is sufficiently heavy to mean that those inherents do not fit into the
  // block. Essentially, we assume that in these exceptional circumstances, it is better to
  // allow an overweight block to be created than to not allow any block at all to be created.
  'Mandatory',
]);

export type DispatchClass = $.Input<typeof $DispatchClass>;

/**
 * Information related to a dispatchable's class, weight, and fee that can be queried from the
 * runtime.
 */
export const $RuntimeDispatchInfo = $.Struct({
  // Weight of this dispatch.
  weight: $Weight,
  // Class of this dispatch.
  class: $DispatchClass,
  // The inclusion fee of this dispatch.
  //
  // This does not include a tip or anything else that
  // depends on the signature (i.e. depends on a `SignedExtension`).
  partialFee: $Balance,
});

export type RuntimeDispatchInfo = $.Input<typeof $RuntimeDispatchInfo>;

/**
 * The base fee and adjusted weight and length fees constitute the _inclusion fee_.
 */
export const $InclusionFee = $.Struct({
  // This is the minimum amount a user pays for a transaction. It is declared
  // as a base _weight_ in the runtime and converted to a fee using `WeightToFee`.
  baseFee: $Balance,
  // The length fee, the amount paid for the encoded length (in bytes) of the transaction.
  lenFee: $Balance,
  //
  // - `targeted_fee_adjustment`: This is a multiplier that can tune the final fee based on the
  //   congestion of the network.
  // - `weight_fee`: This amount is computed based on the weight of the transaction. Weight
  // accounts for the execution time of a transaction.
  //
  // adjusted_weight_fee = targeted_fee_adjustment * weight_fee
  adjustedWeightFee: $Balance,
});

export type InclusionFee = $.Input<typeof $InclusionFee>;

/**
 * The `FeeDetails` is composed of:
 *  - (Optional) `inclusion_fee`: Only the `Pays::Yes` transaction can have the inclusion fee.
 *  - `tip`: If included in the transaction, the tip will be added on top. Only signed
 *     transactions can have a tip.
 */
export const $FeeDetails = $.Struct({
  // The minimum fee for a transaction to be included in a block.
  inclusionFee: $.Option($InclusionFee),
  // Do not serialize and deserialize `tip` as we actually can not pass any tip to the RPC.
  tip: $Balance,
});

export type FeeDetails = $.Input<typeof $FeeDetails>;
