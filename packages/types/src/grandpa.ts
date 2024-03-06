import { Bytes } from '@dedot/codecs';

export interface Prevotes {
  currentWeight: number;
  missing: string[];
}

export interface Precommits {
  currentWeight: number;
  missing: string[];
}

export interface RoundState {
  round: number;
  totalWeight: number;
  thresholdWeight: number;
  prevotes: Prevotes;
  precommits: Precommits;
}

/**
 * The state of the current best round, as well as the background rounds in a
 * form suitable for serialization.
 */
export interface ReportedRoundStates {
  setId: number;
  best: RoundState;
  background: RoundState[];
}

export type JustificationNotification = Bytes;

export type EncodedFinalityProofs = Bytes;
