import { SerdeEnum } from '@delightfuldot/types/serde';
import { registry } from './registry';
import { Option } from '@delightfuldot/codecs';
import { HexString } from '@delightfuldot/utils';

export type DispatchClass = SerdeEnum<{
  normal: void;
  operational: void;
  mandatory: void;
}>;
registry.add('DispatchClass');

export interface WeightV2 {
  ref_time: number;
  proof_size: number;
}
registry.add('WeightV2');

export type WeightV1 = number;
registry.add('WeightV1');

export interface RuntimeDispatchInfo<Weight = WeightV2 | WeightV1> {
  weight: Weight;
  class: DispatchClass;
  partialFee: string; // balance in string format, TODO convert to number or bigint
}
registry.add('RuntimeDispatchInfo');

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/9e56e1acdd278708e4c1c18b94908daf81bab7f5/substrate/frame/transaction-payment/src/types.rs#L35-L49
 */
export interface InclusionFee<Balance> {
  baseFee: Balance;
  lenFee: Balance;
  adjustedWeightFee: Balance;
}
registry.add('InclusionFee');

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/36957d676033b23b46edb66e6d7dcd13da11e19a/substrate/frame/transaction-payment/rpc/src/lib.rs#L133
 */
export type NumberOrHex = number | HexString;

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/9e56e1acdd278708e4c1c18b94908daf81bab7f5/substrate/frame/transaction-payment/src/types.rs#L71-L77
 */
export interface FeeDetails<Balance = NumberOrHex> {
  inclusionFee: Option<Balance>;
}
registry.add('FeeDetails');
