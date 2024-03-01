import * as $ from '@dedot/shape';
import { $BlockHash, $Hash } from '../generic';

/**
 * Possible transaction status events.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/ab3a3bc2786673bfda47646a20f871b8a2e4d59d/substrate/client/transaction-pool/api/src/lib.rs#L58-L132
 */
export const $TransactionStatus = $.Enum({
  // Transaction is part of the future queue.
  Future: null,
  // Transaction is part of the ready queue.
  Ready: null,
  // The transaction has been broadcast to the given peers.
  Broadcast: $.Vec($.str),
  // Transaction has been included in block with given hash
  // at the given position.
  InBlock: $BlockHash,
  // The block this transaction was included in has been retracted.
  Retracted: $BlockHash,
  // Maximum number of finality watchers has been reached,
  // old watchers are being removed.
  FinalityTimeout: $BlockHash,
  // Transaction has been finalized by a finality-gadget, e.g GRANDPA.
  Finalized: $BlockHash,
  // Transaction has been replaced in the pool, by another transaction
  // that provides the same tags. (e.g. same (sender, nonce)).
  Usurped: $Hash,
  // Transaction has been dropped from the pool because of the limit.
  Dropped: null,
  // Transaction is no longer valid in the current state.
  Invalid: null,
});

export type TransactionStatus = $.Input<typeof $TransactionStatus>;
