import { SerdeEnum } from './serde';
import { BlockHash, Bytes, Hash } from '@delightfuldot/codecs';
import { registry } from './registry';

/**
 * Possible transaction status events.
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/ab3a3bc2786673bfda47646a20f871b8a2e4d59d/substrate/client/transaction-pool/api/src/lib.rs#L58-L132
 */
export type TransactionStatus = SerdeEnum<{
  // Transaction is part of the future queue.
  future: void;
  // Transaction is part of the ready queue.
  ready: void;
  // The transaction has been broadcast to the given peers.
  broadcast: string[];
  // Transaction has been included in block with given hash
  // at the given position.
  inBlock: BlockHash;
  // The block this transaction was included in has been retracted.
  retracted: BlockHash;
  // Maximum number of finality watchers has been reached,
  // old watchers are being removed.
  finalityTimeout: BlockHash;
  // Transaction has been finalized by a finality-gadget, e.g GRANDPA.
  finalized: BlockHash;
  // Transaction has been replaced in the pool, by another transaction
  // that provides the same tags. (e.g. same (sender, nonce)).
  usurped: Hash;
  // Transaction has been dropped from the pool because of the limit.
  dropped: void;
  // Transaction is no longer valid in the current state.
  invalid: void;
}>;
registry.add('TransactionStatus');

/**
 * RPC Extrinsic or hash
 *
 * Allows to refer to extrinsic either by its raw representation or its hash.
 */
export type ExtrinsicOrHash = SerdeEnum<{
  // The hash of the extrinsic.
  hash: Hash;
  // Raw extrinsic bytes.
  extrinsic: Bytes;
}>;
registry.add('ExtrinsicOrHash');
