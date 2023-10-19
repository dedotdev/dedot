import { hexToString } from '@polkadot/util';
import * as $ from '@delightfuldot/shape';
import { HexString } from '@delightfuldot/utils';
import { $BlockNumber } from './Block';
import { $Hash } from './Hash';

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
  // TODO inspect!?!
}

export const $ConsensusEngineId: $.Shape<ConsensusEngineId> = $.instance(
  ConsensusEngineId,
  $.Tuple($.FixedHex(4)),
  (value) => [value.id],
);

// TODO docs!
export const $DigestItem = $.Enum({
  Other: { index: 0, value: $.PrefixedHex },
  Consensus: { index: 4, value: $.Tuple($ConsensusEngineId, $.PrefixedHex) },
  Seal: { index: 5, value: $.Tuple($ConsensusEngineId, $.PrefixedHex) },
  PreRuntime: { index: 6, value: $.Tuple($ConsensusEngineId, $.PrefixedHex) },
  RuntimeEnvironmentUpdated: { index: 8 },
});
export type DigestItem = $.Output<typeof $DigestItem>;

export const $Digest = $.Struct({
  logs: $.Vec($DigestItem),
});
export type Digest = $.Output<typeof $Digest>;

export const $Header = $.Struct({
  parentHash: $Hash,
  number: $BlockNumber,
  stateRoot: $Hash,
  extrinsicsRoot: $Hash,
  digest: $Digest,
});
export type Header = $.Output<typeof $Header>;
