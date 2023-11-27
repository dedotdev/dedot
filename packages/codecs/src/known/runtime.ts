import * as $ from '@delightfuldot/shape';
import { $AccountId32 } from '../generic';

/**
 * A multi-format address wrapper for on-chain accounts.
 */
export const $MultiAddress = $.Enum({
  /// It's an account ID (pubkey).
  Id: $AccountId32,
  /// It's an account index.
  Index: $.compactU32,
  /// It's some arbitrary raw bytes.
  Raw: $.PrefixedHex,
  /// It's a 32 byte representation.
  Address32: $.FixedHex(32),
  /// Its a 20 byte representation.
  Address20: $.FixedHex(20),
});

export type MultiAddress = $.Input<typeof $MultiAddress>;

/**
 * DispatchError
 */

export const $TokenError = $.FlatEnum([
  /// Funds are unavailable.
  'FundsUnavailable',
  /// Some part of the balance gives the only provider reference to the account and thus cannot
  /// be (re)moved.
  'OnlyProvider',
  /// Account cannot exist with the funds that would be given.
  'BelowMinimum',
  /// Account cannot be created.
  'CannotCreate',
  /// The asset in question is unknown.
  'UnknownAsset',
  /// Funds exist but are frozen.
  'Frozen',
  /// Operation is not supported by the asset.
  'Unsupported',
  /// Account cannot be created for a held balance.
  'CannotCreateHold',
  /// Withdrawal would cause unwanted loss of account.
  'NotExpendable',
  /// Account cannot receive the assets.
  'Blocked',
]);

export type TokenError = $.Input<typeof $TokenError>;

export const $ModuleError = $.Struct({
  index: $.u8,
  error: $.SizedU8a(4),
});

export type ModuleError = $.Input<typeof $ModuleError>;

export const $TransactionalError = $.FlatEnum([
  /// Too many transactional layers have been spawned.
  'LimitReached',
  /// A transactional layer was expected, but does not exist.
  'NoLayer',
]);

export type TransactionalError = $.Input<typeof $TransactionalError>;

export const $ArithmeticError = $.FlatEnum([
  /// Underflow.
  'Underflow',
  /// Overflow.
  'Overflow',
  /// Division by zero.
  'DivisionByZero',
]);

export type ArithmeticError = $.Input<typeof $ArithmeticError>;

export const $DispatchError = $.Enum({
  /// Some error occurred.
  Other: null,
  /// Failed to lookup some data.
  CannotLookup: null,
  /// A bad origin.
  BadOrigin: null,
  /// A custom error in a module.
  Module: $ModuleError,
  /// At least one consumer is remaining so the account cannot be destroyed.
  ConsumerRemaining: null,
  /// There are no providers so the account cannot be created.
  NoProviders: null,
  /// There are too many consumers so the account cannot be created.
  TooManyConsumers: null,
  /// An error to do with tokens.
  Token: $TokenError,
  /// An arithmetic error.
  Arithmetic: $ArithmeticError,
  /// The number of transactional layers has been reached, or we are not in a transactional
  /// layer.
  Transactional: $TransactionalError,
  /// Resources exhausted, e.g. attempt to read/write data which is too large to manipulate.
  Exhausted: null,
  /// The state is corrupt; this is generally not going to fix itself.
  Corruption: null,
  /// Some resource (e.g. a preimage) is unavailable right now. This might fix itself later.
  Unavailable: null,
  /// Root origin is not allowed.
  RootNotAllowed: null,
});

export type DispatchError = $.Input<typeof $DispatchError>;
