import { registry } from './registry';
import { Bytes } from '@dedot/codecs';

export interface Prevotes {
  currentWeight: number;
  missing: string[];
}
registry.add('Prevotes');

export interface Precommits {
  currentWeight: number;
  missing: string[];
}
registry.add('Precommits');

export interface RoundState {
  round: number;
  totalWeight: number;
  thresholdWeight: number;
  prevotes: Prevotes;
  precommits: Precommits;
}
registry.add('RoundState');

/**
 * The state of the current best round, as well as the background rounds in a
 * form suitable for serialization.
 */
export interface ReportedRoundStates {
  setId: number;
  best: RoundState;
  background: RoundState[];
}
registry.add('ReportedRoundStates');

export type JustificationNotification = Bytes;
registry.add('JustificationNotification');

export type EncodedFinalityProofs = Bytes;
registry.add('EncodedFinalityProofs');
