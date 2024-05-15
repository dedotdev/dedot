import { Hash } from '@dedot/codecs';
import { HexString } from '@dedot/utils';
import { SerdeEnum } from './serde.js';

/**
 * RPC Extrinsic or hash
 *
 * Allows to refer to extrinsic either by its raw representation or its hash.
 */
export type ExtrinsicOrHash = SerdeEnum<{
  // The hash of the extrinsic.
  hash: HexString;
  // Raw extrinsic bytes.
  extrinsic: HexString;
}>;

export type TransactionStatus = SerdeEnum<{
  // Transaction is part of the future queue.
  future: null;
  // Transaction is part of the ready queue.
  ready: null;
  // The transaction has been broadcast to the given peers.
  broadcast: Array<string>;
  // Transaction has been included in block with given hash
  // at the given position.
  inBlock: HexString;
  // The block this transaction was included in has been retracted.
  retracted: HexString;
  // Maximum number of finality watchers has been reached,
  // old watchers are being removed.
  finalityTimeout: HexString;
  // Transaction has been finalized by a finality-gadget, e.g GRANDPA.
  finalized: HexString;
  // Transaction has been replaced in the pool, by another transaction
  // that provides the same tags. (e.g. same (sender, nonce)).
  usurped: Hash;
  // Transaction has been dropped from the pool because of the limit.
  dropped: null;
  // Transaction is no longer valid in the current state.
  invalid: null;
}>;
