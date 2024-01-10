import { hexToBn, hexToString, isHex } from '@polkadot/util';
import * as $ from '@delightfuldot/shape';
import { HexString } from '@delightfuldot/utils';
import { $Hash } from './Hash';
import { registerLooseCodecType } from '../codectypes';

// TODO create a separate codec for $BlockNumber
export const $BlockNumber = $.u32; // TODO docs: why fixed at u32?
$BlockNumber.registerDecoder(
  (input) => isHex(input, -1, true),
  ($shape, input) =>
    hexToBn(input, {
      isLe: false, // TODO docs: why Le=false here?
      isNegative: false,
    }).toNumber(),
);

export type BlockNumberLike = number | HexString;
export type BlockNumber = number;

registerLooseCodecType({ $BlockNumber });

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

// TODO docs!
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
  number: $BlockNumber,
  stateRoot: $Hash,
  extrinsicsRoot: $Hash,
  digest: $Digest,
});
export type Header = $.Input<typeof $Header>;
