import { BlockNumber, Option } from '@dedot/codecs';
import { Callback, GenericJsonRpcApis, Unsub } from '@dedot/types';
import { EncodedFinalityProofs, JustificationNotification, ReportedRoundStates } from './types/index.js';

export interface GrandpaJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Prove finality for the given block number, returning the Justification for the last block in the set.
   *
   * @rpcname grandpa_proveFinality
   * @param {BlockNumber} blockNumber
   **/
  grandpa_proveFinality: (blockNumber: BlockNumber) => Promise<Option<EncodedFinalityProofs>>;

  /**
   * Returns the state of the current best round state as well as the ongoing background rounds
   *
   * @rpcname grandpa_roundState
   **/
  grandpa_roundState: () => Promise<ReportedRoundStates>;

  /**
   * Returns the block most recently finalized by Grandpa, alongside side its justification.
   *
   * @subscription grandpa_justifications, grandpa_subscribeJustifications, grandpa_unsubscribeJustifications
   **/
  grandpa_subscribeJustifications: (callback: Callback<JustificationNotification>) => Promise<Unsub>;
}
