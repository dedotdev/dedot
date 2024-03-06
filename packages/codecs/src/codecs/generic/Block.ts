import * as $ from '@dedot/shape';
import { $ConsensusEngineId, $Header } from './Header';
import { $OpaqueExtrinsic } from '../known/runtime';

export const $Block = $.Struct({
  header: $Header,
  extrinsics: $.Vec($OpaqueExtrinsic),
});

export type Block = $.Input<typeof $Block>;

export const $Justification = $.Tuple($ConsensusEngineId, $.PrefixedHex);
export type Justification = $.Input<typeof $Justification>;
export const $Justifications = $.Vec($Justification);
export type Justifications = $.Input<typeof $Justifications>;

export const $SignedBlock = $.Struct({
  block: $Block,
  justifications: $.Option($Justifications),
});

export type SignedBlock = $.Input<typeof $SignedBlock>;
