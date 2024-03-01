import * as $ from '@dedot/shape';
import { $TransactionValidityError } from './TransactionValidityError';

/**
 * Priority for a transaction. Additive. Higher is better.
 */
export const $TransactionPriority = $.u64;

export type TransactionPriority = $.Input<typeof $TransactionPriority>;

/**
 * Minimum number of blocks a transaction will remain valid for.
 */
export const $TransactionLongevity = $.u64;

export type TransactionLongevity = $.Input<typeof $TransactionLongevity>;

/**
 * Tag for a transaction. No two transactions with the same tag should be placed on-chain.
 */
export const $TransactionTag = $.PrefixedHex;

export type TransactionTag = $.Input<typeof $TransactionTag>;

/**
 * Information concerning a valid transaction.
 */
export const $ValidTransaction = $.Struct({
  /// Priority of the transaction.
  ///
  /// Priority determines the ordering of two transactions that have all
  /// their dependencies (required tags) satisfied.
  priority: $TransactionPriority,
  /// Transaction dependencies
  ///
  /// A non-empty list signifies that some other transactions which provide
  /// given tags are required to be included before that one.
  requires: $.Vec($TransactionTag),
  /// Provided tags
  ///
  /// A list of tags this transaction provides. Successfully importing the transaction
  /// will enable other transactions that depend on (require) those tags to be included as well.
  /// Provided and required tags allow Substrate to build a dependency graph of transactions
  /// and import them in the right (linear) order.
  provides: $.Vec($TransactionTag),
  /// Transaction longevity
  ///
  /// Longevity describes minimum number of blocks the validity is correct.
  /// After this period transaction should be removed from the pool or revalidated.
  longevity: $TransactionLongevity,
  /// A flag indicating if the transaction should be propagated to other peers.
  ///
  /// By setting `false` here the transaction will still be considered for
  /// including in blocks that are authored on the current node, but will
  /// never be sent to other peers.
  propagate: $.bool,
});

export type ValidTransaction = $.Input<typeof $ValidTransaction>;

/**
 * Information on a transaction's validity and, if valid, on how it relates to other transactions.
 */
export const $TransactionValidity = $.Result($ValidTransaction, $TransactionValidityError);

export type TransactionValidity = $.Input<typeof $TransactionValidity>;
