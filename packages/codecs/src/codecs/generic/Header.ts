import { hexToString, isHex } from '@polkadot/util';
import * as $ from '@dedot/shape';
import { HexString } from '@dedot/utils';
import { $Hash } from './Hash';
import { registerLooseCodecType } from '../codectypes';

export const $BlockNumber = $.withMetadata($.metadata('$BlockNumber'), $.u32);
export type BlockNumber = number;

export const $HeaderBlockNumber = $.withMetadata($.metadata('$HeaderBlockNumber'), $.compactU32);

$HeaderBlockNumber.registerDecoder(
  (input) => isHex(input, -1, true),
  // TODO make this more clear?
  // BlockNumber in $Header codec is a hex in BE format
  // So Le=false here is to support decode block number in $Header
  (_, input) => parseInt(input, 16),
);

export class ConsensusEngineId {
  id: HexString;

  constructor(id: HexString) {
    this.id = id;
  }

  get name() {
    return hexToString(this.id);
  }

  toString() {
    return this.name;
  }

  toJSON() {
    return this.name;
  }
  // TODO inspect!?!
}

export type ConsensusEngineIdLike = ConsensusEngineId | HexString;

export const $ConsensusEngineId: $.Shape<ConsensusEngineIdLike, ConsensusEngineId> = $.instance(
  ConsensusEngineId,
  $.Tuple($.FixedHex(4)),
  (value) => {
    if (value instanceof ConsensusEngineId) {
      return [value.id];
    } else {
      return [value];
    }
  },
);

registerLooseCodecType({ $ConsensusEngineId });

/**
 * Digest item that is able to encode/decode 'system' digest items and
 * provide opaque access to other items.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/runtime/src/generic/digest.rs#L72-L109
 */
export const $DigestItem = $.Enum({
  Other: { index: 0, value: $.PrefixedHex },
  Consensus: { index: 4, value: $.Tuple($ConsensusEngineId, $.PrefixedHex) },
  Seal: { index: 5, value: $.Tuple($ConsensusEngineId, $.PrefixedHex) },
  PreRuntime: { index: 6, value: $.Tuple($ConsensusEngineId, $.PrefixedHex) },
  RuntimeEnvironmentUpdated: { index: 8 },
});
export type DigestItem = $.Input<typeof $DigestItem>;

export const $Digest = $.Struct({
  logs: $.Vec($DigestItem),
});
export type Digest = $.Input<typeof $Digest>;

export const $Header = $.Struct({
  parentHash: $Hash,
  number: $HeaderBlockNumber,
  stateRoot: $Hash,
  extrinsicsRoot: $Hash,
  digest: $Digest,
});
export type Header = $.Input<typeof $Header>;
